/**
 * シンプルな認証ミドルウェア（Supabase削除済み）
 * 現在は認証機能を無効化
 */

import { type NextRequest, NextResponse } from "next/server";

// ロギングユーティリティ
function logMiddleware(request: NextRequest, corsApplied: boolean) {
  console.log("=== Middleware Debug ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  console.log("Path:", request.nextUrl.pathname);
  console.log("CORS Applied:", corsApplied);
  console.log("Headers:", Object.fromEntries(request.headers.entries()));
  console.log("=======================");
}

export async function middleware(request: NextRequest) {
  // 認証機能は削除済み - 全てのルートへのアクセスを許可
  const response = NextResponse.next();

  // MCPエンドポイント用のCORS設定
  const pathname = request.nextUrl.pathname;
  let corsApplied = false;

  if (pathname.startsWith("/api")) {
    corsApplied = true;
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Cache-Control",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");

    console.log(`✅ CORS headers applied for: ${pathname}`);
  }

  // リクエストをログ
  logMiddleware(request, corsApplied);

  // OPTIONSリクエストの場合は早期リターン
  if (request.method === "OPTIONS") {
    console.log("OPTIONS request - returning 200 OK");
    return new Response(null, {
      status: 200,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
