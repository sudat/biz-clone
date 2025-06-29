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
    // NextRequest.nextUrlを使用してより安全にパーシング
    const searchParams = request.nextUrl.searchParams;
    
    // クエリパラメータを取得（堅牢な文字エンコーディング処理）
    const rawQuery = searchParams.get("query");
    let query: string | null = null;
    
    if (rawQuery) {
      try {
        // 複数の方法でデコードを試行
        if (rawQuery.includes('%')) {
          // URL エンコードされている場合
          query = decodeURIComponent(rawQuery);
        } else {
          // プレーンテキストの場合
          query = rawQuery;
        }
        
        // 文字列の妥当性チェック
        if (query && query.length > 0) {
          // 制御文字を除去
          query = query.replace(/[\x00-\x1F\x7F]/g, '');
        }
      } catch (error) {
        console.warn('クエリパラメータのデコードに失敗:', error);
        // デコードに失敗した場合は元の値を使用
        query = rawQuery;
      }
    }
    
    const categoriesParam = searchParams.get("categories");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));

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
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
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
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error("統合検索エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "統合検索に失敗しました",
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
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
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
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
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error("統合検索エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "統合検索に失敗しました",
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    );
  }
}