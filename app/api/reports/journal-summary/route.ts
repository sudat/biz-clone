/**
 * 仕訳集計API Route
 * ============================================================================
 * 勘定科目・取引先・部門・期間別の集計・月次・日次集計対応
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getJournalSummary } from "@/lib/database/search-analysis";

// リクエストスキーマ
const journalSummarySchema = z.object({
  dateFrom: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, "有効な開始日を入力してください (YYYY-MM-DD)"),
  dateTo: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, "有効な終了日を入力してください (YYYY-MM-DD)"),
  groupBy: z.enum(["account", "partner", "department", "month", "day"]).default("account"),
  accountType: z.enum(["資産", "負債", "純資産", "収益", "費用"]).optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータを取得
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const groupBy = searchParams.get("groupBy") || "account";
    const accountType = searchParams.get("accountType");

    // パラメータの検証
    const validationResult = journalSummarySchema.safeParse({
      dateFrom,
      dateTo,
      groupBy,
      accountType: accountType || undefined
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

    // 日付の妥当性チェック
    const startDate = new Date(params.dateFrom);
    const endDate = new Date(params.dateTo);
    
    if (startDate > endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: "開始日は終了日より前である必要があります"
        },
        { status: 400 }
      );
    }

    // 期間の妥当性チェック（あまりに長い期間はパフォーマンスの問題があるため）
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1095) { // 3年以上
      return NextResponse.json(
        { 
          success: false, 
          error: "集計期間は3年以内に設定してください"
        },
        { status: 400 }
      );
    }

    // 仕訳集計データ取得
    const result = await getJournalSummary(params);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        groupBy: params.groupBy,
        accountType: params.accountType || "全て",
        periodDays: daysDiff,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("仕訳集計取得エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "仕訳集計の取得に失敗しました"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // リクエストボディの検証
    const validationResult = journalSummarySchema.safeParse(body);

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

    // 日付の妥当性チェック
    const startDate = new Date(params.dateFrom);
    const endDate = new Date(params.dateTo);
    
    if (startDate > endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: "開始日は終了日より前である必要があります"
        },
        { status: 400 }
      );
    }

    // 期間の妥当性チェック（あまりに長い期間はパフォーマンスの問題があるため）
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1095) { // 3年以上
      return NextResponse.json(
        { 
          success: false, 
          error: "集計期間は3年以内に設定してください"
        },
        { status: 400 }
      );
    }

    // 仕訳集計データ取得
    const result = await getJournalSummary(params);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        groupBy: params.groupBy,
        accountType: params.accountType || "全て",
        periodDays: daysDiff,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("仕訳集計取得エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "仕訳集計の取得に失敗しました"
      },
      { status: 500 }
    );
  }
}