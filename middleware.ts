import {
  createMiddlewareSupabaseClient,
  protectedRoutes,
  publicRoutes,
} from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware for Supabase authentication
 * - 認証が必要なルートの保護
 * - セッションの自動更新
 * - 認証状態に基づくリダイレクト
 */
export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createMiddlewareSupabaseClient(request);
    const { pathname } = request.nextUrl;

    // セッション情報を取得（自動更新）
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // デバッグログ
    console.log(
      `[Middleware] Path: ${pathname}, User: ${user ? user.id : "none"}`,
    );

    // 認証が必要なルートの場合
    const isProtectedRoute = protectedRoutes.some((route) => {
      if (route === "/") {
        // ルートパスは完全一致でチェック
        return pathname === "/";
      }
      // その他のパスは前方一致でチェック
      return pathname.startsWith(route);
    });

    if (isProtectedRoute) {
      if (!user) {
        // 未認証の場合はログインページにリダイレクト
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("redirectedFrom", pathname);
        return Response.redirect(redirectUrl);
      }
    }

    // 認証済みユーザーがログインページにアクセスした場合
    if (user && pathname === "/login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/"; // トップページにリダイレクト
      return Response.redirect(redirectUrl);
    }

    return response;
  } catch (e) {
    // エラーが発生した場合は次のミドルウェアに進む
    console.error("Middleware error:", e);
    return NextResponse.next();
  }
}

export const config = {
  /*
   * 認証チェックを実行するパスを指定
   * - api/auth/* : Supabase認証関連のAPI（除外）
   * - _next/static/* : 静的ファイル（除外）
   * - _next/image* : Next.js画像最適化（除外）
   * - favicon.ico : ファビコン（除外）
   */
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
