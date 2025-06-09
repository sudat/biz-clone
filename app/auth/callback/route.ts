import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/database/types";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/master/accounts";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    try {
      // Supabaseで認証コードを交換
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent(error.message)}`,
            requestUrl.origin,
          ),
        );
      }

      // 認証成功時はredirectパラメータまたはデフォルトページに遷移
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (error) {
      console.error("Unexpected auth callback error:", error);
      return NextResponse.redirect(
        new URL("/login?error=callback_failed", requestUrl.origin),
      );
    }
  }

  // codeパラメータがない場合はログインページにリダイレクト
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
