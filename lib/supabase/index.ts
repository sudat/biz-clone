// クライアントサイド用
export { createClient, getSupabaseClient } from "./client";

// サーバーサイド用
export { 
  createServerSupabaseClient, 
  createServerSupabaseClientReadOnly 
} from "./server";

// ミドルウェア用
export { 
  createMiddlewareSupabaseClient,
  protectedRoutes,
  publicRoutes
} from "./middleware";

// 使用例のコメント
/*
Client Components で使用:
import { createClient } from "@/lib/supabase";
const supabase = createClient();

Server Components で使用:
import { createServerSupabaseClient } from "@/lib/supabase";
const supabase = await createServerSupabaseClient();

Server Actions で使用:
import { createServerSupabaseClient } from "@/lib/supabase";
const supabase = await createServerSupabaseClient();

Middleware で使用:
import { createMiddlewareSupabaseClient } from "@/lib/supabase";
const { supabase, response } = createMiddlewareSupabaseClient(request);
*/ 