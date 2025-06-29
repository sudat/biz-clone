/**
 * SSE Client for Next.js MCP Integration
 * ============================================================================
 * EventSource-based client for real-time communication with server
 * ============================================================================
 */

import { SSEEventData, SSEEventType, MCPMessage, MCPNotification } from './types';

export interface SSEClientOptions {
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onEvent?: (eventData: SSEEventData) => void;
}

export enum SSEConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

/**
 * SSEクライアントクラス
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private connectionState: SSEConnectionState = SSEConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly options: Omit<Required<SSEClientOptions>, 'userId'> & { userId?: string };

  constructor(options: SSEClientOptions = {}) {
    this.options = {
      userId: options.userId,
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      onConnect: options.onConnect ?? (() => {}),
      onDisconnect: options.onDisconnect ?? (() => {}),
      onError: options.onError ?? (() => {}),
      onEvent: options.onEvent ?? (() => {})
    };
  }

  /**
   * SSE接続を開始
   */
  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.connectionState = SSEConnectionState.CONNECTING;
    
    // SSEエンドポイントURL構築
    const url = new URL('/api/sse', window.location.origin);
    if (this.options.userId) {
      url.searchParams.set('userId', this.options.userId);
    }

    try {
      this.eventSource = new EventSource(url.toString());
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.connectionState = SSEConnectionState.ERROR;
      this.options.onError(error as Event);
      this.scheduleReconnect();
    }
  }

  /**
   * SSE接続を切断
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.connectionState = SSEConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.options.onDisconnect();
  }

  /**
   * EventSourceイベントリスナーの設定
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
      this.connectionState = SSEConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.options.onConnect();
    };

    this.eventSource.onmessage = (event) => {
      try {
        // MCP準拠のメッセージをパース
        const mcpMessage: MCPMessage = JSON.parse(event.data);
        
        if (this.isMCPNotification(mcpMessage)) {
          // MCP通知メッセージの処理
          const eventData = mcpMessage.params.data;
          this.options.onEvent(eventData);
        } else if (mcpMessage.method === 'initialize') {
          // MCPハンドシェイク受信
          console.log('MCP handshake received:', mcpMessage);
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.connectionState = SSEConnectionState.ERROR;
      this.options.onError(error);
      
      // 自動再接続が有効な場合
      if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * 再接続をスケジュール
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.connectionState = SSEConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    console.log(`Scheduling SSE reconnect attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }

  /**
   * MCP通知メッセージかどうかを判定
   */
  private isMCPNotification(message: MCPMessage): message is MCPNotification {
    return message.method === 'notifications/message' && 
           message.params && 
           message.params.data;
  }

  /**
   * 現在の接続状態を取得
   */
  getConnectionState(): SSEConnectionState {
    return this.connectionState;
  }

  /**
   * 接続が確立されているかどうか
   */
  isConnected(): boolean {
    return this.connectionState === SSEConnectionState.CONNECTED;
  }

  /**
   * 特定のイベントタイプのリスナーを追加
   */
  addEventListener(eventType: SSEEventType, listener: (data: any) => void): void {
    const currentOnEvent = this.options.onEvent;
    this.options.onEvent = (eventData: SSEEventData) => {
      if (eventData.type === eventType) {
        listener(eventData.data);
      }
      currentOnEvent(eventData);
    };
  }

  /**
   * ユーザーIDを更新
   */
  setUserId(userId: string): void {
    const wasConnected = this.isConnected();
    this.options.userId = userId;
    
    if (wasConnected) {
      // 再接続してユーザーIDを更新
      this.disconnect();
      setTimeout(() => this.connect(), 100);
    }
  }
}