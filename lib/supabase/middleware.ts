import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "../database/types";

/**
 * ミドルウェア用Supabaseクライアント
 * - Next.js middlewareで認証セッションを更新
 * - 自動的なセッション管理とトークンリフレッシュ
 */
export const createMiddlewareSupabaseClient = (request: NextRequest) => {
  // レスポンスオブジェクトを作成
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return { supabase, response };
};

/**
 * 認証が必要なルートを保護するヘルパー関数
 */
export const protectedRoutes = [
  "/",
  "/siwake",
  "/master",
  "/reports",
];

/**
 * 公開ルート（認証不要）
 */
export const publicRoutes = [
  "/login",
  "/signup",
  "/auth/callback",
];
