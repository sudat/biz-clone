/**
 * SSE Types for Next.js MCP Integration
 * ============================================================================
 * Type definitions for Server-Sent Events with MCP protocol support
 * ============================================================================
 */

/**
 * SSEイベントタイプ
 */
export enum SSEEventType {
  JOURNAL_CREATED = 'journal_created',
  JOURNAL_UPDATED = 'journal_updated',  
  JOURNAL_DELETED = 'journal_deleted',
  MASTER_DATA_UPDATED = 'master_data_updated',
  SYSTEM_STATUS = 'system_status'
}

/**
 * SSEイベントデータの型定義
 */
export interface SSEEventData {
  type: SSEEventType;
  timestamp: string;
  data: any;
  userId?: string;
}

/**
 * MCP準拠のメッセージフォーマット
 */
export interface MCPMessage {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number;
  result?: any;
}

/**
 * MCP通知メッセージ
 */
export interface MCPNotification extends MCPMessage {
  method: 'notifications/message';
  params: {
    level: 'info' | 'warn' | 'error';
    data: SSEEventData;
  };
}

/**
 * MCPハンドシェイクメッセージ
 */
export interface MCPHandshake extends MCPMessage {
  id: 'handshake';
  method: 'initialize';
  result: {
    protocolVersion: string;
    capabilities: {
      tools: Record<string, any>;
      logging: Record<string, any>;
    };
    serverInfo: {
      name: string;
      version: string;
    };
  };
}

/**
 * SSEクライアント接続情報
 */
export interface SSEConnection {
  id: string;
  controller: ReadableStreamDefaultController;
  lastHeartbeat: Date;
  userId?: string;
}

/**
 * SSEイベント送信リクエスト
 */
export interface SSEEventRequest {
  eventType: SSEEventType;
  data: any;
  targetUserId?: string;
}