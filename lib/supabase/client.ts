import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database/types";

/**
 * クライアントサイド用Supabaseクライアント
 * - Client Componentsやブラウザで実行される処理で使用
 * - リアルタイム機能、クライアント側の認証処理に適用
 */
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// シングルトンインスタンス（必要に応じて使用）
let clientInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}; 