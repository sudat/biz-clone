/**
 * シンプルな認証ミドルウェア（Supabase削除済み）
 * 現在は認証機能を無効化
 */

import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // 認証機能は削除済み - 全てのルートへのアクセスを許可
  const response = NextResponse.next();

  // MCPとSSEエンドポイント用のCORS設定
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api") || pathname.startsWith("/sse")) {
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
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
