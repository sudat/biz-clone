/**
 * リアルタイムマスターデータ同期フック
 * ============================================================================
 * 複数ユーザー間でのリアルタイム同期、競合解決、楽観的更新を提供
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database/types';
import { snakeToCamel, camelToSnake } from '@/lib/utils/typeConverters';
import { showSuccessToast, showWarningToast, showInfoToast, showErrorToast } from '@/components/ui/error-toast';
import { ErrorType, ErrorInfo } from '@/lib/types/errors';

type SupabaseClient = ReturnType<typeof createClientComponentClient<Database>>;

// 変更イベント型定義
interface ChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: string;
  userId?: string;
}

// 競合データ型
interface ConflictData<T> {
  localData: T;
  remoteData: T;
  changedFields: string[];
  conflictId: string;
}

// 同期状態型
interface SyncState {
  isConnected: boolean;
  isOptimisticUpdate: boolean;
  pendingUpdates: number;
  lastSyncTime: string | null;
  conflicts: ConflictData<any>[];
}

// オプション設定
interface UseMasterSyncOptions {
  enableRealtime?: boolean;
  enableOptimisticUpdates?: boolean;
  conflictResolution?: 'manual' | 'server-wins' | 'client-wins';
  notifyChanges?: boolean;
  debounceMs?: number;
}

const DEFAULT_OPTIONS: UseMasterSyncOptions = {
  enableRealtime: true,
  enableOptimisticUpdates: true,
  conflictResolution: 'manual',
  notifyChanges: true,
  debounceMs: 500,
};

/**
 * リアルタイムマスターデータ同期フック
 */
export function useRealtimeMasterSync<T extends Record<string, any>>(
  masterType: 'accounts' | 'partners' | 'analysis_codes' | 'sub_accounts',
  initialData: T[] = [],
  options: UseMasterSyncOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const supabase = createClientComponentClient<Database>();
  
  // State管理
  const [data, setData] = useState<T[]>(initialData);
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    isOptimisticUpdate: false,
    pendingUpdates: 0,
    lastSyncTime: null,
    conflicts: [],
  });
  
  // 内部状態管理
  const optimisticUpdatesRef = useRef<Map<string, T>>(new Map());
  const pendingOperationsRef = useRef<Map<string, 'create' | 'update' | 'delete'>>(new Map());
  const channelRef = useRef<any>(null);

  // プライマリキー取得ヘルパー
  const getPrimaryKey = useCallback((item: T): string => {
    switch (masterType) {
      case 'accounts': return item.accountCode || item.account_code;
      case 'partners': return item.partnerCode || item.partner_code;
      case 'analysis_codes': return item.analysisCode || item.analysis_code;
      case 'sub_accounts': 
        return `${item.accountCode || item.account_code}-${item.subAccountCode || item.sub_account_code}`;
      default: return item.id || '';
    }
  }, [masterType]);

  // フィールド比較ヘルパー
  const getChangedFields = useCallback((local: T, remote: T): string[] => {
    const changed: string[] = [];
    const localKeys = Object.keys(local);
    const remoteKeys = Object.keys(remote);
    
    const allKeys = Array.from(new Set([...localKeys, ...remoteKeys]));
    
    for (const key of allKeys) {
      if (key === 'updatedAt' || key === 'updated_at') continue; // タイムスタンプは除外
      if (JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
        changed.push(key);
      }
    }
    
    return changed;
  }, []);

  // 競合検知
  const detectConflict = useCallback((localItem: T, remoteItem: T): ConflictData<T> | null => {
    const pk = getPrimaryKey(localItem);
    const isOptimistic = optimisticUpdatesRef.current.has(pk);
    
    if (!isOptimistic) return null;
    
    const changedFields = getChangedFields(localItem, remoteItem);
    if (changedFields.length === 0) return null;
    
    return {
      localData: localItem,
      remoteData: remoteItem,
      changedFields,
      conflictId: `${masterType}-${pk}-${Date.now()}`,
    };
  }, [masterType, getPrimaryKey, getChangedFields]);

  // 楽観的更新の適用
  const applyOptimisticUpdate = useCallback((
    operation: 'create' | 'update' | 'delete',
    item: T,
    updateData?: Partial<T>
  ) => {
    if (!config.enableOptimisticUpdates) return;

    const pk = getPrimaryKey(item);
    
    setSyncState(prev => ({ ...prev, isOptimisticUpdate: true, pendingUpdates: prev.pendingUpdates + 1 }));
    pendingOperationsRef.current.set(pk, operation);
    
    setData(prevData => {
      switch (operation) {
        case 'create':
          optimisticUpdatesRef.current.set(pk, item);
          return [...prevData, item];
          
        case 'update':
          const updatedItem = { ...item, ...updateData };
          optimisticUpdatesRef.current.set(pk, updatedItem);
          return prevData.map(dataItem => 
            getPrimaryKey(dataItem) === pk ? updatedItem : dataItem
          );
          
        case 'delete':
          optimisticUpdatesRef.current.set(pk, item);
          return prevData.filter(dataItem => getPrimaryKey(dataItem) !== pk);
          
        default:
          return prevData;
      }
    });

    // 一定時間後に楽観的更新をクリア（失敗時のフォールバック）
    setTimeout(() => {
      if (optimisticUpdatesRef.current.has(pk)) {
        console.warn(`Optimistic update timeout for ${pk}, reverting...`);
        revertOptimisticUpdate(pk);
      }
    }, 10000); // 10秒タイムアウト
  }, [config.enableOptimisticUpdates, getPrimaryKey]);

  // 楽観的更新の元に戻し
  const revertOptimisticUpdate = useCallback((pk: string) => {
    optimisticUpdatesRef.current.delete(pk);
    pendingOperationsRef.current.delete(pk);
    
    setSyncState(prev => ({ 
      ...prev, 
      pendingUpdates: Math.max(0, prev.pendingUpdates - 1),
      isOptimisticUpdate: prev.pendingUpdates > 1
    }));
    
    // データを再読み込み
    refreshData();
  }, []);

  // 競合解決
  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'accept-local' | 'accept-remote' | 'merge'
  ) => {
    setSyncState(prev => ({
      ...prev,
      conflicts: prev.conflicts.filter(c => c.conflictId !== conflictId)
    }));

    if (config.notifyChanges) {
      showSuccessToast('競合が解決されました', `解決方法: ${resolution}`);
    }
  }, [config.notifyChanges]);

  // データリフレッシュ
  const refreshData = useCallback(async () => {
    try {
      const { data: freshData, error } = await supabase
        .from(masterType)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const convertedData = freshData?.map(item => snakeToCamel<T>(item)) || [];
      setData(convertedData);
      
      setSyncState(prev => ({ ...prev, lastSyncTime: new Date().toISOString() }));
    } catch (error) {
      console.error('Failed to refresh data:', error);
      if (config.notifyChanges) {
        showErrorToast({
          type: ErrorType.DATABASE,
          message: 'データの再読み込みに失敗しました',
        });
      }
    }
  }, [supabase, masterType, config.notifyChanges]);

  // リアルタイム変更ハンドラー
  const handleRealtimeChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (config.notifyChanges) {
      const operation = eventType === 'INSERT' ? '追加' : 
                      eventType === 'UPDATE' ? '更新' : 
                      eventType === 'DELETE' ? '削除' : '変更';
      
      showInfoToast(
        'データが更新されました',
        `他のユーザーによる${operation}が検知されました`,
        3000
      );
    }

    setData(prevData => {
      switch (eventType) {
        case 'INSERT': {
          const newItem = snakeToCamel<T>(newRecord);
          const pk = getPrimaryKey(newItem);
          
          // 楽観的更新と重複チェック
          if (optimisticUpdatesRef.current.has(pk)) {
            optimisticUpdatesRef.current.delete(pk);
            pendingOperationsRef.current.delete(pk);
            setSyncState(prev => ({ 
              ...prev, 
              pendingUpdates: Math.max(0, prev.pendingUpdates - 1)
            }));
            return prevData; // 楽観的更新済みなのでスキップ
          }
          
          return [...prevData, newItem];
        }
        
        case 'UPDATE': {
          const updatedItem = snakeToCamel<T>(newRecord);
          const pk = getPrimaryKey(updatedItem);
          
          // 競合検知
          const localItem = prevData.find(item => getPrimaryKey(item) === pk);
          if (localItem && optimisticUpdatesRef.current.has(pk)) {
            const conflict = detectConflict(localItem, updatedItem);
            if (conflict) {
              setSyncState(prev => ({
                ...prev,
                conflicts: [...prev.conflicts, conflict]
              }));
              
              if (config.conflictResolution === 'server-wins') {
                optimisticUpdatesRef.current.delete(pk);
                pendingOperationsRef.current.delete(pk);
                return prevData.map(item => getPrimaryKey(item) === pk ? updatedItem : item);
              } else if (config.conflictResolution === 'client-wins') {
                return prevData; // ローカル変更を保持
              }
              // manual の場合は競合リストに追加して何もしない
              return prevData;
            }
          }
          
          // 楽観的更新のクリア
          if (optimisticUpdatesRef.current.has(pk)) {
            optimisticUpdatesRef.current.delete(pk);
            pendingOperationsRef.current.delete(pk);
            setSyncState(prev => ({ 
              ...prev, 
              pendingUpdates: Math.max(0, prev.pendingUpdates - 1)
            }));
          }
          
          return prevData.map(item => getPrimaryKey(item) === pk ? updatedItem : item);
        }
        
        case 'DELETE': {
          const deletedItem = snakeToCamel<T>(oldRecord);
          const pk = getPrimaryKey(deletedItem);
          
          // 楽観的更新のクリア
          if (optimisticUpdatesRef.current.has(pk)) {
            optimisticUpdatesRef.current.delete(pk);
            pendingOperationsRef.current.delete(pk);
            setSyncState(prev => ({ 
              ...prev, 
              pendingUpdates: Math.max(0, prev.pendingUpdates - 1)
            }));
          }
          
          return prevData.filter(item => getPrimaryKey(item) !== pk);
        }
        
        default:
          return prevData;
      }
    });
  }, [config, getPrimaryKey, detectConflict]);

  // Realtimeサブスクリプション設定
  useEffect(() => {
    if (!config.enableRealtime) return;

    const channel = supabase
      .channel(`master-${masterType}-sync`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: masterType,
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        setSyncState(prev => ({ 
          ...prev, 
          isConnected: status === 'SUBSCRIBED' 
        }));
        
        if (status === 'SUBSCRIBED' && config.notifyChanges) {
          showSuccessToast('リアルタイム同期が開始されました');
        } else if (status === 'CLOSED' && config.notifyChanges) {
          showWarningToast('リアルタイム同期が切断されました');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [config.enableRealtime, config.notifyChanges, masterType, handleRealtimeChange]);

  // 初期データロード
  useEffect(() => {
    if (initialData.length === 0) {
      refreshData();
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      optimisticUpdatesRef.current.clear();
      pendingOperationsRef.current.clear();
    };
  }, []);

  return {
    data,
    syncState,
    applyOptimisticUpdate,
    revertOptimisticUpdate,
    resolveConflict,
    refreshData,
  };
}

/**
 * 特定マスタ用のカスタムフック
 */
export function useAccountRealtimeSync(initialData?: any[], options?: UseMasterSyncOptions) {
  return useRealtimeMasterSync('accounts', initialData, options);
}

export function usePartnerRealtimeSync(initialData?: any[], options?: UseMasterSyncOptions) {
  return useRealtimeMasterSync('partners', initialData, options);
}

export function useAnalysisCodeRealtimeSync(initialData?: any[], options?: UseMasterSyncOptions) {
  return useRealtimeMasterSync('analysis_codes', initialData, options);
}

export function useSubAccountRealtimeSync(initialData?: any[], options?: UseMasterSyncOptions) {
  return useRealtimeMasterSync('sub_accounts', initialData, options);
}