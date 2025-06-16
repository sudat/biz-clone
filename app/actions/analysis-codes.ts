"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createAnalysisCodeSchema, updateAnalysisCodeSchema } from "@/lib/schemas/master";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

/**
 * 分析コードの重複チェック
 */
export async function checkAnalysisCodeExists(analysisCode: string): Promise<{ exists: boolean; analysisCode?: any }> {
  try {
    const existingAnalysisCode = await prisma.analysisCode.findUnique({
      where: { analysisCode },
      select: {
        analysisCode: true,
        analysisName: true,
        analysisType: true,
        isActive: true
      }
    });

    return {
      exists: !!existingAnalysisCode,
      analysisCode: existingAnalysisCode || undefined
    };
  } catch (error) {
    console.error("分析コード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * 分析コード一覧の取得
 */
export async function getAnalysisCodes() {
  try {
    const analysisCodes = await prisma.analysisCode.findMany({
      where: { isActive: true },
      orderBy: [
        { analysisType: 'asc' },
        { sortOrder: 'asc' },
        { analysisCode: 'asc' }
      ]
    });
    
    // 日時を日本時間に変換
    const analysisCodesForClient = analysisCodes.map(analysisCode => ({
      ...analysisCode,
      createdAt: toJST(analysisCode.createdAt),
      updatedAt: toJST(analysisCode.updatedAt),
    }));
    
    return { success: true, data: analysisCodesForClient };
  } catch (error) {
    console.error('分析コード取得エラー:', error);
    return { success: false, error: '分析コードの取得に失敗しました' };
  }
}

/**
 * 分析種別一覧の取得（マスタテーブルから）
 */
export async function getAnalysisTypes() {
  try {
    const types = await prisma.analysisType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { typeCode: 'asc' }]
    });
    
    return { 
      success: true, 
      data: types.map(type => ({
        typeCode: type.typeCode,
        typeName: type.typeName
      }))
    };
  } catch (error) {
    console.error('分析種別取得エラー:', error);
    return { success: false, error: '分析種別の取得に失敗しました' };
  }
}

/**
 * 分析種別を作成
 */
export async function createAnalysisType(typeCode: string, typeName: string) {
  try {
    // 重複チェック
    const existing = await prisma.analysisType.findUnique({
      where: { typeCode }
    });

    if (existing) {
      return { success: false, error: 'この種別コードは既に存在します' };
    }

    const analysisType = await prisma.analysisType.create({
      data: {
        typeCode,
        typeName,
        isActive: true
      }
    });
    
    return { 
      success: true, 
      data: analysisType
    };
  } catch (error) {
    console.error('分析種別作成エラー:', error);
    return { success: false, error: '分析種別の作成に失敗しました' };
  }
}

/**
 * 分析コードの作成
 */
export async function createAnalysisCode(formData: FormData) {
  try {
    const data = {
      analysisCode: formData.get('analysisCode') as string,
      analysisName: formData.get('analysisName') as string,
      analysisType: formData.get('analysisType') as string,
      sortOrder: formData.get('sortOrder') ? Number(formData.get('sortOrder')) : null,
    };

    const result = createAnalysisCodeSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: '入力値が正しくありません' };
    }

    const analysisCode = await prisma.analysisCode.create({
      data: {
        ...result.data,
        isActive: true,
      }
    });

    revalidatePath('/master/analysis-codes');
    return { success: true, data: analysisCode };
  } catch (error) {
    console.error('分析コード作成エラー:', error);
    return { success: false, error: '分析コードの作成に失敗しました' };
  }
}

/**
 * 分析コードの更新
 */
export async function updateAnalysisCode(analysisCode: string, formData: FormData) {
  try {
    const data = {
      analysisName: formData.get('analysisName') as string,
      analysisType: formData.get('analysisType') as string,
      sortOrder: formData.get('sortOrder') ? Number(formData.get('sortOrder')) : null,
    };

    const result = updateAnalysisCodeSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: '入力値が正しくありません' };
    }

    const updatedAnalysisCode = await prisma.analysisCode.update({
      where: { analysisCode },
      data: result.data
    });

    revalidatePath('/master/analysis-codes');
    return { success: true, data: updatedAnalysisCode };
  } catch (error) {
    console.error('分析コード更新エラー:', error);
    return { success: false, error: '分析コードの更新に失敗しました' };
  }
}

/**
 * 分析コードの削除
 */
export async function deleteAnalysisCode(analysisCode: string): Promise<ActionResult> {
  try {
    // 削除前に関連データの存在チェック
    const relatedJournalDetails = await prisma.journalDetail.findFirst({
      where: { analysisCode },
      select: { journalNumber: true, lineNumber: true }
    });

    // 関連データが存在する場合は削除を拒否
    if (relatedJournalDetails) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "この分析コードは使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 物理削除を実行
    await prisma.analysisCode.delete({
      where: { analysisCode },
    });

    revalidatePath('/master/analysis-codes');
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "分析コードの削除", "分析コード");
  }
}

/**
 * 分析コードの検索
 */
export async function searchAnalysisCodes(searchTerm: string, filters: Record<string, any> = {}) {
  try {
    const analysisCodes = await prisma.analysisCode.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { analysisCode: { contains: searchTerm, mode: 'insensitive' } },
            { analysisName: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }),
        ...(filters.analysisType && {
          analysisType: filters.analysisType
        })
      },
      orderBy: [
        { analysisType: 'asc' },
        { sortOrder: 'asc' },
        { analysisCode: 'asc' }
      ]
    });
    
    // 日時を日本時間に変換
    const analysisCodesForClient = analysisCodes.map(analysisCode => ({
      ...analysisCode,
      createdAt: toJST(analysisCode.createdAt),
      updatedAt: toJST(analysisCode.updatedAt),
    }));
    
    return { success: true, data: analysisCodesForClient };
  } catch (error) {
    console.error('分析コード検索エラー:', error);
    return { success: false, error: '分析コードの検索に失敗しました' };
  }
}