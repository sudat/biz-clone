/**
 * シンプルな認証ミドルウェア（Supabase削除済み）
 * 現在は認証機能を無効化
 */

import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // 認証機能は削除済み - 全てのルートへのアクセスを許可
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};