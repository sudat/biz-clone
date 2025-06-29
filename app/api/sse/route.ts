/**
 * SSE Endpoint for Next.js MCP Integration
 * ============================================================================
 * Main Server-Sent Events endpoint with MCP protocol support
 * ============================================================================
 */

import { NextRequest } from "next/server";
import { sseEventManager } from "@/lib/sse/event-manager";

// ロギングユーティリティ
function logSSERequest(method: string, headers: any, params: any) {
  console.log("=== SSE Request Debug ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", method);
  console.log("Headers:", JSON.stringify(headers, null, 2));
  console.log("Query Params:", JSON.stringify(params, null, 2));
  console.log("========================");
}

function logSSEConnection(connectionId: string, userId?: string) {
  console.log("=== SSE Connection Debug ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Connection ID:", connectionId);
  console.log("User ID:", userId || "anonymous");
  console.log("============================");
}

/**
 * SSE接続のGETハンドラー
 */
export async function GET(request: NextRequest) {
  const requestHeaders = Object.fromEntries(request.headers.entries());
  const queryParams = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );

  // リクエストをログ
  logSSERequest("GET", requestHeaders, queryParams);

  // CORS対応
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Cache-Control, Accept, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "X-Accel-Buffering": "no",
  });

  console.log("SSE Response Headers:", Object.fromEntries(headers.entries()));

  // クエリパラメータからユーザーIDを取得（オプション）
  const userId = request.nextUrl.searchParams.get("userId") || undefined;

  // 一意の接続IDを生成
  const connectionId = `conn_${Date.now()}_${
    Math.random().toString(36).substr(2, 9)
  }`;

  logSSEConnection(connectionId, userId);

  // ReadableStreamでSSE接続を作成
  const stream = new ReadableStream({
    start(controller) {
      // 接続をイベントマネージャーに追加
      sseEventManager.addConnection(connectionId, controller, userId);
    },

    cancel() {
      // 接続が中断された場合のクリーンアップ
      sseEventManager.removeConnection(connectionId);
      console.log(`SSE connection cancelled by client: ${connectionId}`);
    },
  });

  return new Response(stream, { headers });
}

/**
 * プリフライトリクエスト対応
 */
export async function OPTIONS(request: NextRequest) {
  const requestHeaders = Object.fromEntries(request.headers.entries());
  logSSERequest("OPTIONS", requestHeaders, {});

  const response = new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Cache-Control, Accept, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
    },
  });

  console.log("SSE OPTIONS response sent");
  return response;
}
