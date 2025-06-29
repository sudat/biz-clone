/**
 * SSE Endpoint for Next.js MCP Integration
 * ============================================================================
 * Main Server-Sent Events endpoint with MCP protocol support
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { sseEventManager } from '@/lib/sse/event-manager';

/**
 * SSE接続のGETハンドラー
 */
export async function GET(request: NextRequest) {
  // CORS対応
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Accept, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'X-Accel-Buffering': 'no'
  });

  // クエリパラメータからユーザーIDを取得（オプション）
  const userId = request.nextUrl.searchParams.get('userId') || undefined;
  
  // 一意の接続IDを生成
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // ReadableStreamでSSE接続を作成
  const stream = new ReadableStream({
    start(controller) {
      // 接続をイベントマネージャーに追加
      sseEventManager.addConnection(connectionId, controller, userId);
      
      console.log(`New SSE connection established: ${connectionId}${userId ? ` (user: ${userId})` : ''}`);
    },
    
    cancel() {
      // 接続が中断された場合のクリーンアップ
      sseEventManager.removeConnection(connectionId);
      console.log(`SSE connection cancelled: ${connectionId}`);
    }
  });

  return new Response(stream, { headers });
}

/**
 * プリフライトリクエスト対応
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Accept, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}