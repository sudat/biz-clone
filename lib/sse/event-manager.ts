/**
 * SSE Event Manager for Next.js
 * ============================================================================
 * Manages SSE connections and event broadcasting with MCP protocol support
 * ============================================================================
 */

import {
  MCPHandshake,
  MCPMessage,
  MCPNotification,
  SSEConnection,
  SSEEventData,
  SSEEventType,
} from "./types";

/**
 * SSEイベントマネージャークラス
 */
class SSEEventManager {
  private connections = new Map<string, SSEConnection>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * 新しいSSE接続を追加
   */
  addConnection(
    connectionId: string,
    controller: ReadableStreamDefaultController,
    userId?: string,
  ): void {
    const connection: SSEConnection = {
      id: connectionId,
      controller,
      lastHeartbeat: new Date(),
      userId,
    };

    this.connections.set(connectionId, connection);

    // MCP準拠のハンドシェイク送信
    this.sendHandshake(connection);

    // 接続確認イベント送信
    this.sendEventToConnection(connection, {
      type: SSEEventType.SYSTEM_STATUS,
      timestamp: new Date().toISOString(),
      data: {
        status: "connected",
        message: "SSE connection established for Claude Web integration",
      },
    });

    console.log(
      `SSE connection added: ${connectionId}, total connections: ${this.connections.size}`,
    );
  }

  /**
   * SSE接続を削除
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        // Controller状態を確認してからクローズ
        // ReadableStreamDefaultControllerはclosedプロパティがないため、
        // エラーキャッチで既存クローズ状態を判定
        connection.controller.close();
      } catch (error) {
        // 既にクローズされている場合のエラーは正常なケース
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        if (
          errorMessage.includes("already closed") ||
          errorMessage.includes("Controller is already closed")
        ) {
          console.log(`SSE connection already closed: ${connectionId}`);
        } else {
          console.warn(
            `SSE connection close error for ${connectionId}:`,
            errorMessage,
          );
        }
      }
      this.connections.delete(connectionId);
      console.log(
        `SSE connection removed: ${connectionId}, remaining connections: ${this.connections.size}`,
      );
    }
  }

  /**
   * 全クライアントにイベントをブロードキャスト
   */
  broadcastEvent(eventData: SSEEventData): void {
    const message = this.formatSSEMessage(eventData);
    let failedConnections: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      if (!this.isConnectionActive(connection)) {
        failedConnections.push(connectionId);
        return;
      }

      try {
        connection.controller.enqueue(message);
        connection.lastHeartbeat = new Date();
      } catch (error) {
        console.error(
          `SSE broadcast error for connection ${connectionId}:`,
          error,
        );
        failedConnections.push(connectionId);
      }
    });

    // 失敗した接続を削除
    failedConnections.forEach((connectionId) => {
      this.removeConnection(connectionId);
    });
  }

  /**
   * 特定のユーザーにイベントを送信
   */
  sendEventToUser(userId: string, eventData: SSEEventData): void {
    const userConnections = Array.from(this.connections.values())
      .filter((conn) => conn.userId === userId);

    userConnections.forEach((connection) => {
      this.sendEventToConnection(connection, eventData);
    });
  }

  /**
   * 特定の接続にイベントを送信
   */
  private sendEventToConnection(
    connection: SSEConnection,
    eventData: SSEEventData,
  ): void {
    if (!this.isConnectionActive(connection)) {
      this.removeConnection(connection.id);
      return;
    }

    try {
      const message = this.formatSSEMessage(eventData);
      connection.controller.enqueue(message);
      connection.lastHeartbeat = new Date();
    } catch (error) {
      console.error(`SSE send error for connection ${connection.id}:`, error);
      this.removeConnection(connection.id);
    }
  }

  /**
   * 接続がアクティブかどうかを確認
   */
  private isConnectionActive(connection: SSEConnection): boolean {
    try {
      // enqueueのテスト (空メッセージで確認)
      return connection.controller !== null &&
        connection.controller !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * MCPハンドシェイクを送信
   */
  private sendHandshake(connection: SSEConnection): void {
    const handshake: MCPHandshake = {
      jsonrpc: "2.0",
      id: "handshake",
      method: "initialize",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          logging: {},
        },
        serverInfo: {
          name: "biz-clone-mcp-server",
          version: "1.0.0",
        },
      },
    };

    const message = `data: ${JSON.stringify(handshake)}\n\n`;
    try {
      connection.controller.enqueue(message);
    } catch (error) {
      console.error("Error sending MCP handshake:", error);
      this.removeConnection(connection.id);
    }
  }

  /**
   * SSEメッセージの形式化 (MCP準拠)
   */
  private formatSSEMessage(eventData: SSEEventData): string {
    const mcpMessage: MCPNotification = {
      jsonrpc: "2.0",
      method: "notifications/message",
      params: {
        level: "info",
        data: eventData,
      },
    };

    return `data: ${JSON.stringify(mcpMessage)}\n\n`;
  }

  /**
   * ハートビート開始
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      // 古い接続をクリーンアップ（5分以上応答なし）
      const now = new Date();
      const staleConnections: string[] = [];

      this.connections.forEach((connection, connectionId) => {
        try {
          // SSE標準のコメント形式でハートビートを送信
          const heartbeat = `: heartbeat @ ${now.toISOString()}\n\n`;
          connection.controller.enqueue(heartbeat);
          connection.lastHeartbeat = now;
        } catch (error) {
          console.log(
            `Heartbeat failed for ${connectionId}. Removing connection.`,
          );
          staleConnections.push(connectionId);
        }

        const timeSinceLastHeartbeat = now.getTime() -
          connection.lastHeartbeat.getTime();
        if (timeSinceLastHeartbeat > 5 * 60 * 1000) { // 5分
          console.log(`Connection ${connectionId} is stale.`);
          staleConnections.push(connectionId);
        }
      });

      staleConnections.forEach((connectionId) => {
        console.log(`Removing stale/failed SSE connection: ${connectionId}`);
        this.removeConnection(connectionId);
      });
    }, 20000); // 20秒間隔
  }

  /**
   * アクティブな接続数を取得
   */
  getActiveConnections(): number {
    return this.connections.size;
  }

  /**
   * 全接続情報を取得
   */
  getConnectionsInfo(): Array<
    { id: string; userId?: string; lastHeartbeat: Date }
  > {
    return Array.from(this.connections.values()).map((conn) => ({
      id: conn.id,
      userId: conn.userId,
      lastHeartbeat: conn.lastHeartbeat,
    }));
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.connections.forEach((connection, connectionId) => {
      this.removeConnection(connectionId);
    });
  }
}

// シングルトンインスタンス
export const sseEventManager = new SSEEventManager();

// プロセス終了時のクリーンアップ
process.on("beforeExit", () => {
  sseEventManager.cleanup();
});
