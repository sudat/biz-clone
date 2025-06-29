/**
 * SSE React Context Provider
 * ============================================================================
 * React Context Provider for SSE connection management
 * ============================================================================
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { SSEClient, SSEClientOptions, SSEConnectionState } from '@/lib/sse/client';
import { SSEEventData, SSEEventType } from '@/lib/sse/types';

interface SSEContextValue {
  connectionState: SSEConnectionState;
  isConnected: boolean;
  eventHistory: SSEEventData[];
  connect: () => void;
  disconnect: () => void;
  sendEvent: (eventType: SSEEventType, data: any, targetUserId?: string) => Promise<boolean>;
  addEventListener: (eventType: SSEEventType, listener: (data: any) => void) => void;
  clearEventHistory: () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

interface SSEProviderProps {
  children: React.ReactNode;
  userId?: string;
  autoConnect?: boolean;
  maxEventHistory?: number;
  options?: Partial<SSEClientOptions>;
}

/**
 * SSE Context Provider Component
 */
export function SSEProvider({
  children,
  userId,
  autoConnect = true,
  maxEventHistory = 100,
  options = {}
}: SSEProviderProps) {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>(SSEConnectionState.DISCONNECTED);
  const [eventHistory, setEventHistory] = useState<SSEEventData[]>([]);
  const sseClientRef = useRef<SSEClient | null>(null);
  const eventListenersRef = useRef<Map<string, (data: any) => void>>(new Map());

  // SSEクライアント初期化
  useEffect(() => {
    const clientOptions: SSEClientOptions = {
      userId,
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...options,
      onConnect: () => {
        setConnectionState(SSEConnectionState.CONNECTED);
        console.log('SSE connected');
        options.onConnect?.();
      },
      onDisconnect: () => {
        setConnectionState(SSEConnectionState.DISCONNECTED);
        console.log('SSE disconnected');
        options.onDisconnect?.();
      },
      onError: (error) => {
        setConnectionState(SSEConnectionState.ERROR);
        console.error('SSE error:', error);
        options.onError?.(error);
      },
      onEvent: (eventData) => {
        // イベント履歴に追加
        setEventHistory(prev => {
          const newHistory = [eventData, ...prev];
          return newHistory.slice(0, maxEventHistory);
        });
        
        // 個別イベントリスナーを呼び出し
        const listener = eventListenersRef.current.get(eventData.type);
        if (listener) {
          listener(eventData.data);
        }
        
        options.onEvent?.(eventData);
      }
    };

    sseClientRef.current = new SSEClient(clientOptions);

    if (autoConnect) {
      sseClientRef.current.connect();
    }

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
      }
    };
  }, [userId, autoConnect, maxEventHistory, options]);

  // 接続状態の監視
  useEffect(() => {
    const interval = setInterval(() => {
      if (sseClientRef.current) {
        const currentState = sseClientRef.current.getConnectionState();
        setConnectionState(currentState);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(() => {
    sseClientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    sseClientRef.current?.disconnect();
  }, []);

  const sendEvent = useCallback(async (
    eventType: SSEEventType,
    data: any,
    targetUserId?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/sse/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          data,
          targetUserId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send event: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Event sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Failed to send SSE event:', error);
      return false;
    }
  }, []);

  const addEventListener = useCallback((
    eventType: SSEEventType,
    listener: (data: any) => void
  ) => {
    eventListenersRef.current.set(eventType, listener);
  }, []);

  const clearEventHistory = useCallback(() => {
    setEventHistory([]);
  }, []);

  const contextValue: SSEContextValue = {
    connectionState,
    isConnected: connectionState === SSEConnectionState.CONNECTED,
    eventHistory,
    connect,
    disconnect,
    sendEvent,
    addEventListener,
    clearEventHistory
  };

  return (
    <SSEContext.Provider value={contextValue}>
      {children}
    </SSEContext.Provider>
  );
}

/**
 * SSE Context Hook
 */
export function useSSE(): SSEContextValue {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE must be used within an SSEProvider');
  }
  return context;
}

/**
 * 特定イベントタイプのHook
 */
export function useSSEEvent<T = any>(
  eventType: SSEEventType,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { addEventListener } = useSSE();

  useEffect(() => {
    addEventListener(eventType, callback);
  }, [eventType, addEventListener, ...deps]);
}

/**
 * 仕訳作成イベント用Hook
 */
export function useJournalEvents() {
  const [journalCreated, setJournalCreated] = useState<any>(null);
  const [journalUpdated, setJournalUpdated] = useState<any>(null);

  useSSEEvent(SSEEventType.JOURNAL_CREATED, setJournalCreated);
  useSSEEvent(SSEEventType.JOURNAL_UPDATED, setJournalUpdated);

  return {
    journalCreated,
    journalUpdated,
    clearJournalEvents: () => {
      setJournalCreated(null);
      setJournalUpdated(null);
    }
  };
}

/**
 * マスタデータ更新イベント用Hook
 */
export function useMasterDataEvents() {
  const [masterDataUpdated, setMasterDataUpdated] = useState<any>(null);

  useSSEEvent(SSEEventType.MASTER_DATA_UPDATED, setMasterDataUpdated);

  return {
    masterDataUpdated,
    clearMasterDataEvents: () => {
      setMasterDataUpdated(null);
    }
  };
}