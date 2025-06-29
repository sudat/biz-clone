/**
 * 試算表API Route
 * ============================================================================
 * 期間指定での残高集計・勘定科目区分による絞り込み
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTrialBalance } from "@/lib/database/search-analysis";

// リクエストスキーマ
const trialBalanceSchema = z.object({
  dateFrom: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, "有効な開始日を入力してください (YYYY-MM-DD)"),
  dateTo: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, "有効な終了日を入力してください (YYYY-MM-DD)"),
  accountType: z.enum(["資産", "負債", "純資産", "収益", "費用"]).optional(),
  includeZeroBalance: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータを取得
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const accountType = searchParams.get("accountType");
    const includeZeroBalance = searchParams.get("includeZeroBalance") === "true";

    // パラメータの検証
    const validationResult = trialBalanceSchema.safeParse({
      dateFrom,
      dateTo,
      accountType: accountType || undefined,
      includeZeroBalance
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

    // 試算表データ取得
    const result = await getTrialBalance(params);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        accountType: params.accountType || "全て",
        includeZeroBalance: params.includeZeroBalance,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("試算表取得エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "試算表の取得に失敗しました"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // リクエストボディの検証
    const validationResult = trialBalanceSchema.safeParse(body);

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

    // 試算表データ取得
    const result = await getTrialBalance(params);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        accountType: params.accountType || "全て",
        includeZeroBalance: params.includeZeroBalance,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("試算表取得エラー:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "試算表の取得に失敗しました"
      },
      { status: 500 }
    );
  }
}