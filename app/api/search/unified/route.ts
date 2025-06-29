/**
 * 統合検索API Route
 * ============================================================================
 * 仕訳・勘定科目・取引先・部門・分析コードを横断検索
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { performUnifiedSearch } from "@/lib/database/search-analysis";

// リクエストスキーマ
const searchSchema = z.object({
  query: z.string().min(1, "検索クエリは必須です"),
  categories: z.array(z.enum(["journals", "accounts", "partners", "departments", "analysis_codes"])).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10)
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータを取得
    const query = searchParams.get("query");
    const categoriesParam = searchParams.get("categories");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // パラメータの検証
    const validationResult = searchSchema.safeParse({
      query,
      categories: categoriesParam ? categoriesParam.split(",") : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "パラメータが無効です",
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const params = validationResult.data;

    // 統合検索実行
    const result = await performUnifiedSearch(params);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        query: params.query,
        page: params.page,
        limit: params.limit,
        categories: params.categories || ["journals", "accounts", "partners", "departments", "analysis_codes"]
      }
    });

  } catch (error) {
    console.error("統合検索エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "統合検索に失敗しました"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // リクエストボディの検証
    const validationResult = searchSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "リクエストボディが無効です",
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const params = validationResult.data;

    // 統合検索実行
    const result = await performUnifiedSearch(params);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        query: params.query,
        page: params.page,
        limit: params.limit,
        categories: params.categories || ["journals", "accounts", "partners", "departments", "analysis_codes"]
      }
    });

  } catch (error) {
    console.error("統合検索エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "統合検索に失敗しました"
      },
      { status: 500 }
    );
  }
}