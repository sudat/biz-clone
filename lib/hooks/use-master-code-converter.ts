/**
 * マスタデータ コード⇔名称変換フック（Supabase Realtime対応）
 * ============================================================================
 * リアルタイムでのコード入力時の名称自動表示、名称検索時のコード自動入力、
 * 無効なコードのエラーハンドリング、キャッシュ機能を提供
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database/types';
import { snakeToCamel, camelToSnake } from '@/lib/utils/typeConverters';

type SupabaseClient = ReturnType<typeof createClientComponentClient<Database>>;

// マスタデータ型定義
interface MasterData {
  code: string;
  name: string;
  is_active: boolean;
}

interface AccountMaster extends MasterData {
  account_code: string;
  account_name: string;
  account_type?: string;
  is_detail?: boolean;
}

interface PartnerMaster extends MasterData {
  partner_code: string;
  partner_name: string;
  partner_kana?: string;
  partner_type?: string;
}

interface AnalysisCodeMaster extends MasterData {
  analysis_code: string;
  analysis_name: string;
  analysis_type?: string;
}

interface SubAccountMaster extends MasterData {
  account_code: string;
  sub_account_code: string;
  sub_account_name: string;
}

// キャッシュ型定義
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// 変換結果型
interface ConversionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isLoading: boolean;
  fromCache: boolean;
}

// フック設定オプション
interface UseCodeConverterOptions {
  enableRealtime?: boolean;
  cacheTimeout?: number; // milliseconds
  debounceMs?: number;
  enableValidation?: boolean;
}

// デフォルト設定
const DEFAULT_OPTIONS: UseCodeConverterOptions = {
  enableRealtime: true,
  cacheTimeout: 5 * 60 * 1000, // 5分
  debounceMs: 300,
  enableValidation: true,
};

/**
 * マスタデータ変換フック
 */
export function useMasterCodeConverter<T extends MasterData>(
  masterType: 'accounts' | 'partners' | 'analysis_codes' | 'sub_accounts',
  options: UseCodeConverterOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const supabase = createClientComponentClient<Database>();
  
  // State管理
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, CacheEntry<T>>>(new Map());
  const [realtimeData, setRealtimeData] = useState<T[]>([]);

  // Realtimeサブスクリプション設定
  useEffect(() => {
    if (!config.enableRealtime) return;

    const channel = supabase
      .channel(`master-${masterType}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: masterType,
        },
        (payload) => {
          console.log(`Master data change detected in ${masterType}:`, payload);
          
          // キャッシュクリア（変更されたレコードに関連するもの）
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const updatedCache = new Map(cache);
            
            // 変更されたレコードに関連するキャッシュエントリを削除
            for (const [key, entry] of updatedCache.entries()) {
              const codeField = getCodeField(masterType);
              if (payload.old && payload.old[codeField] && key.includes(payload.old[codeField])) {
                updatedCache.delete(key);
              }
            }
            
            setCache(updatedCache);
          }
          
          // 全データリフレッシュ（軽量な実装として）
          refreshMasterData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [masterType, config.enableRealtime]);

  // マスタデータ全体をリフレッシュ
  const refreshMasterData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(masterType)
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // snake_case → T型に変換
      const convertedData = data?.map(item => snakeToCamel<T>(item)) || [];
      setRealtimeData(convertedData);
    } catch (err) {
      console.error(`Failed to refresh ${masterType} data:`, err);
    }
  }, [supabase, masterType]);

  // 初期データロード
  useEffect(() => {
    refreshMasterData();
  }, [refreshMasterData]);

  // キャッシュ有効性チェック
  const isCacheValid = useCallback((entry: CacheEntry<T>): boolean => {
    return Date.now() - entry.timestamp < entry.ttl;
  }, []);

  // キャッシュから取得
  const getFromCache = useCallback((key: string): T | null => {
    const entry = cache.get(key);
    if (entry && isCacheValid(entry)) {
      return entry.data;
    }
    return null;
  }, [cache, isCacheValid]);

  // キャッシュに保存
  const saveToCache = useCallback((key: string, data: T) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.cacheTimeout || DEFAULT_OPTIONS.cacheTimeout!,
    };
    
    setCache(prev => new Map(prev.set(key, entry)));
  }, [config.cacheTimeout]);

  // コードフィールド名を取得
  const getCodeField = (type: string): string => {
    switch (type) {
      case 'accounts': return 'account_code';
      case 'partners': return 'partner_code';
      case 'analysis_codes': return 'analysis_code';
      case 'sub_accounts': return 'sub_account_code';
      default: return 'code';
    }
  };

  // 名称フィールド名を取得
  const getNameField = (type: string): string => {
    switch (type) {
      case 'accounts': return 'account_name';
      case 'partners': return 'partner_name';
      case 'analysis_codes': return 'analysis_name';
      case 'sub_accounts': return 'sub_account_name';
      default: return 'name';
    }
  };

  /**
   * コードから名称を取得
   */
  const getNameByCode = useCallback(async (
    code: string,
    additionalFilters?: Record<string, any>
  ): Promise<ConversionResult<string>> => {
    if (!code?.trim()) {
      return { success: false, error: 'コードを入力してください', isLoading: false, fromCache: false };
    }

    // キャッシュチェック
    const cacheKey = `code-to-name-${code}-${JSON.stringify(additionalFilters || {})}`;
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      const nameField = getNameField(masterType);
      return { 
        success: true, 
        data: (cachedResult as any)[nameField], 
        isLoading: false, 
        fromCache: true 
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(masterType)
        .select('*')
        .eq(getCodeField(masterType), code)
        .eq('is_active', true);

      // 追加フィルター適用
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { 
            success: false, 
            error: `コード「${code}」が見つかりません`, 
            isLoading: false, 
            fromCache: false 
          };
        }
        throw error;
      }

      // snake_case → T型に変換
      const convertedData = snakeToCamel<T>(data);
      
      // キャッシュに保存
      saveToCache(cacheKey, convertedData);

      const nameField = getNameField(masterType);
      return { 
        success: true, 
        data: (convertedData as any)[nameField], 
        isLoading: false, 
        fromCache: false 
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '名称の取得に失敗しました';
      setError(errorMessage);
      return { success: false, error: errorMessage, isLoading: false, fromCache: false };
    } finally {
      setIsLoading(false);
    }
  }, [supabase, masterType, getFromCache, saveToCache]);

  /**
   * 名称からコードを取得
   */
  const getCodeByName = useCallback(async (
    name: string,
    additionalFilters?: Record<string, any>
  ): Promise<ConversionResult<string>> => {
    if (!name?.trim()) {
      return { success: false, error: '名称を入力してください', isLoading: false, fromCache: false };
    }

    // キャッシュチェック
    const cacheKey = `name-to-code-${name}-${JSON.stringify(additionalFilters || {})}`;
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      const codeField = getCodeField(masterType);
      return { 
        success: true, 
        data: (cachedResult as any)[codeField], 
        isLoading: false, 
        fromCache: true 
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(masterType)
        .select('*')
        .eq(getNameField(masterType), name)
        .eq('is_active', true);

      // 追加フィルター適用
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { 
            success: false, 
            error: `名称「${name}」が見つかりません`, 
            isLoading: false, 
            fromCache: false 
          };
        }
        throw error;
      }

      // snake_case → T型に変換
      const convertedData = snakeToCamel<T>(data);
      
      // キャッシュに保存
      saveToCache(cacheKey, convertedData);

      const codeField = getCodeField(masterType);
      return { 
        success: true, 
        data: (convertedData as any)[codeField], 
        isLoading: false, 
        fromCache: false 
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'コードの取得に失敗しました';
      setError(errorMessage);
      return { success: false, error: errorMessage, isLoading: false, fromCache: false };
    } finally {
      setIsLoading(false);
    }
  }, [supabase, masterType, getFromCache, saveToCache]);

  /**
   * コード検索（オートコンプリート用）
   */
  const searchCodes = useCallback(async (
    query: string,
    limit: number = 10,
    additionalFilters?: Record<string, any>
  ): Promise<ConversionResult<T[]>> => {
    if (!query?.trim()) {
      return { success: true, data: [], isLoading: false, fromCache: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const codeField = getCodeField(masterType);
      const nameField = getNameField(masterType);

      let queryBuilder = supabase
        .from(masterType)
        .select('*')
        .eq('is_active', true)
        .or(`${codeField}.ilike.%${query}%,${nameField}.ilike.%${query}%`)
        .limit(limit);

      // 追加フィルター適用
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // snake_case → T型に変換
      const convertedData = data?.map(item => snakeToCamel<T>(item)) || [];

      return { success: true, data: convertedData, isLoading: false, fromCache: false };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '検索に失敗しました';
      setError(errorMessage);
      return { success: false, error: errorMessage, isLoading: false, fromCache: false };
    } finally {
      setIsLoading(false);
    }
  }, [supabase, masterType]);

  /**
   * キャッシュクリア
   */
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // メモ化されたリターン値
  return useMemo(() => ({
    getNameByCode,
    getCodeByName,
    searchCodes,
    clearCache,
    isLoading,
    error,
    realtimeData,
    cacheSize: cache.size,
  }), [
    getNameByCode,
    getCodeByName,
    searchCodes,
    clearCache,
    isLoading,
    error,
    realtimeData,
    cache.size,
  ]);
}

/**
 * 勘定科目専用フック
 */
export function useAccountCodeConverter(options?: UseCodeConverterOptions) {
  return useMasterCodeConverter<AccountMaster>('accounts', options);
}

/**
 * 取引先専用フック
 */
export function usePartnerCodeConverter(options?: UseCodeConverterOptions) {
  return useMasterCodeConverter<PartnerMaster>('partners', options);
}

/**
 * 分析コード専用フック
 */
export function useAnalysisCodeConverter(options?: UseCodeConverterOptions) {
  return useMasterCodeConverter<AnalysisCodeMaster>('analysis_codes', options);
}

/**
 * 補助科目専用フック
 */
export function useSubAccountCodeConverter(options?: UseCodeConverterOptions) {
  return useMasterCodeConverter<SubAccountMaster>('sub_accounts', options);
}

/**
 * 複数マスタデータを一括で変換するフック
 */
export function useBatchCodeConverter() {
  const accountConverter = useAccountCodeConverter();
  const partnerConverter = usePartnerCodeConverter();
  const analysisCodeConverter = useAnalysisCodeConverter();
  const subAccountConverter = useSubAccountCodeConverter();

  const batchGetNamesByCode = useCallback(async (requests: Array<{
    type: 'accounts' | 'partners' | 'analysis_codes' | 'sub_accounts';
    code: string;
    additionalFilters?: Record<string, any>;
  }>) => {
    const promises = requests.map(async (request) => {
      switch (request.type) {
        case 'accounts':
          return await accountConverter.getNameByCode(request.code, request.additionalFilters);
        case 'partners':
          return await partnerConverter.getNameByCode(request.code, request.additionalFilters);
        case 'analysis_codes':
          return await analysisCodeConverter.getNameByCode(request.code, request.additionalFilters);
        case 'sub_accounts':
          return await subAccountConverter.getNameByCode(request.code, request.additionalFilters);
        default:
          return { success: false, error: 'Unknown master type', isLoading: false, fromCache: false };
      }
    });

    return await Promise.all(promises);
  }, [accountConverter, partnerConverter, analysisCodeConverter, subAccountConverter]);

  return {
    batchGetNamesByCode,
    accountConverter,
    partnerConverter,
    analysisCodeConverter,
    subAccountConverter,
  };
}