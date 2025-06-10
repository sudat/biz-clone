"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createAnalysisCodeSchema, updateAnalysisCodeSchema } from "@/lib/schemas/master";
import type { AnalysisCode } from "@/lib/database/prisma";

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
    
    return { success: true, data: analysisCodes };
  } catch (error) {
    console.error('分析コード取得エラー:', error);
    return { success: false, error: '分析コードの取得に失敗しました' };
  }
}

/**
 * 分析種別一覧の取得
 */
export async function getAnalysisTypes() {
  try {
    const types = await prisma.analysisCode.findMany({
      where: { isActive: true },
      select: { analysisType: true },
      distinct: ['analysisType'],
      orderBy: { analysisType: 'asc' }
    });
    
    return { 
      success: true, 
      data: types.map(type => type.analysisType) 
    };
  } catch (error) {
    console.error('分析種別取得エラー:', error);
    return { success: false, error: '分析種別の取得に失敗しました' };
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
export async function deleteAnalysisCode(analysisCode: string) {
  try {
    await prisma.analysisCode.update({
      where: { analysisCode },
      data: { isActive: false }
    });

    revalidatePath('/master/analysis-codes');
    return { success: true };
  } catch (error) {
    console.error('分析コード削除エラー:', error);
    return { success: false, error: '分析コードの削除に失敗しました' };
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
    
    return { success: true, data: analysisCodes };
  } catch (error) {
    console.error('分析コード検索エラー:', error);
    return { success: false, error: '分析コードの検索に失敗しました' };
  }
}