"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import type { TaxRate } from "@/lib/database/prisma";
import { toJST } from "@/lib/utils/date-utils";

// Client Component用の税区分型（Decimal型をnumber型に変換）
export type TaxRateForClient = Omit<TaxRate, "taxRate"> & {
  taxRate: number;
};

/**
 * 税区分コードの重複チェック
 */
export async function checkTaxCodeExists(taxCode: string): Promise<{ exists: boolean; taxRate?: any }> {
  try {
    const existingTaxRate = await prisma.taxRate.findUnique({
      where: { taxCode },
      select: {
        taxCode: true,
        taxName: true,
        taxRate: true,
        isActive: true
      }
    });

    return {
      exists: !!existingTaxRate,
      taxRate: existingTaxRate || undefined
    };
  } catch (error) {
    console.error("税区分コード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * 税区分一覧の取得
 */
export async function getTaxRates(): Promise<{ success: boolean; data?: TaxRateForClient[]; error?: string }> {
  try {
    const taxRates = await prisma.taxRate.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { taxCode: 'asc' }
      ]
    });
    
    // Decimal型をnumber型に変換、日時を日本時間に変換
    const taxRatesForClient: TaxRateForClient[] = taxRates.map(taxRate => ({
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    }));
    
    return { success: true, data: taxRatesForClient };
  } catch (error) {
    console.error('税区分取得エラー:', error);
    return { success: false, error: '税区分の取得に失敗しました' };
  }
}

/**
 * 税区分の作成
 */
export async function createTaxRate(formData: FormData): Promise<{ success: boolean; data?: TaxRateForClient; error?: string }> {
  try {
    const data = {
      taxCode: formData.get('taxCode') as string,
      taxName: formData.get('taxName') as string,
      taxRate: parseFloat(formData.get('taxRate') as string),
      sortOrder: formData.get('sortOrder') ? Number(formData.get('sortOrder')) : null,
    };

    // 基本バリデーション
    if (!data.taxCode || !data.taxName || isNaN(data.taxRate)) {
      return { success: false, error: '必須項目が入力されていません' };
    }

    // 重複チェック
    const existingCheck = await checkTaxCodeExists(data.taxCode);
    if (existingCheck.exists) {
      return { success: false, error: 'この税区分コードは既に使用されています' };
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        taxCode: data.taxCode,
        taxName: data.taxName,
        taxRate: data.taxRate,
        sortOrder: data.sortOrder,
        isActive: true,
      }
    });

    // Decimal型をnumber型に変換
    const taxRateForClient: TaxRateForClient = {
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    };

    revalidatePath('/master/tax-rates');
    return { success: true, data: taxRateForClient };
  } catch (error) {
    console.error('税区分作成エラー:', error);
    return { success: false, error: '税区分の作成に失敗しました' };
  }
}

/**
 * 税区分の更新
 */
export async function updateTaxRate(taxCode: string, formData: FormData): Promise<{ success: boolean; data?: TaxRateForClient; error?: string }> {
  try {
    const data = {
      taxName: formData.get('taxName') as string,
      taxRate: parseFloat(formData.get('taxRate') as string),
      sortOrder: formData.get('sortOrder') ? Number(formData.get('sortOrder')) : null,
      isActive: formData.get('isActive') === 'true',
    };

    // 基本バリデーション
    if (!data.taxName || isNaN(data.taxRate)) {
      return { success: false, error: '必須項目が入力されていません' };
    }

    const taxRate = await prisma.taxRate.update({
      where: { taxCode },
      data: {
        taxName: data.taxName,
        taxRate: data.taxRate,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      }
    });

    // Decimal型をnumber型に変換
    const taxRateForClient: TaxRateForClient = {
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    };

    revalidatePath('/master/tax-rates');
    return { success: true, data: taxRateForClient };
  } catch (error) {
    console.error('税区分更新エラー:', error);
    return { success: false, error: '税区分の更新に失敗しました' };
  }
}

/**
 * 税区分の削除（論理削除）
 */
export async function deleteTaxRate(taxCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.taxRate.update({
      where: { taxCode },
      data: { isActive: false }
    });

    revalidatePath('/master/tax-rates');
    return { success: true };
  } catch (error) {
    console.error('税区分削除エラー:', error);
    return { success: false, error: '税区分の削除に失敗しました' };
  }
}

/**
 * 税区分の検索
 */
export async function searchTaxRates(searchTerm: string, filters: Record<string, any> = {}): Promise<{ success: boolean; data?: TaxRateForClient[]; error?: string }> {
  try {
    const taxRates = await prisma.taxRate.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { taxCode: { contains: searchTerm, mode: 'insensitive' } },
            { taxName: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }),
      },
      orderBy: [
        { sortOrder: 'asc' },
        { taxCode: 'asc' }
      ]
    });
    
    // Decimal型をnumber型に変換、日時を日本時間に変換
    const taxRatesForClient: TaxRateForClient[] = taxRates.map(taxRate => ({
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    }));
    
    return { success: true, data: taxRatesForClient };
  } catch (error) {
    console.error('税区分検索エラー:', error);
    return { success: false, error: '税区分の検索に失敗しました' };
  }
}