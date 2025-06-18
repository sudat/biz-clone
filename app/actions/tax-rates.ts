"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createTaxRateSchema, updateTaxRateSchema } from "@/lib/schemas/master";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";
import type { TaxRateForClient } from "@/types/unified";

// ====================
// 税率マスタのシンプルなServer Actions
// ====================

// TaxRateForClient型は types/unified.ts で定義
export type { TaxRateForClient } from "@/types/unified";

/**
 * 税区分コードの重複チェック
 */
export async function checkTaxCodeExists(
  taxCode: string,
): Promise<{ exists: boolean; taxRate?: { taxCode: string; taxName: string; taxRate: number; isActive: boolean } }> {
  try {
    const existingTaxRate = await prisma.taxRate.findUnique({
      where: { taxCode },
      select: {
        taxCode: true,
        taxName: true,
        taxRate: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingTaxRate,
      taxRate: existingTaxRate ? {
        ...existingTaxRate,
        taxRate: existingTaxRate.taxRate.toNumber(),
      } : undefined,
    };
  } catch (error) {
    console.error("税区分コード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * 税区分一覧の取得（完全camelCase対応）
 */
export async function getTaxRates(): Promise<ActionResult<TaxRateForClient[]>> {
  try {
    const taxRates = await prisma.taxRate.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { taxCode: "asc" }
      ],
    });

    // Decimal型をnumber型に変換、日時を日本時間に変換
    const taxRatesForClient: TaxRateForClient[] = taxRates.map((taxRate) => ({
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    }));

    return { success: true, data: taxRatesForClient };
  } catch (error) {
    return handleServerActionError(error, "税区分の取得", "税区分");
  }
}

/**
 * 税区分の作成
 */
export async function createTaxRate(
  formData: FormData,
): Promise<ActionResult<TaxRateForClient>> {
  const data = {
    taxCode: formData.get("taxCode") as string,
    taxName: formData.get("taxName") as string,
    taxRate: (() => {
      const taxRateStr = formData.get("taxRate") as string;
      const taxRateNum = parseFloat(taxRateStr);
      return isNaN(taxRateNum) ? 0 : taxRateNum;
    })(),
    isActive: formData.get("isActive") === "true",
    sortOrder: formData.get("sortOrder")
      ? parseInt(formData.get("sortOrder") as string)
      : undefined,
  };

  try {
    // バリデーション
    const result = createTaxRateSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // 税区分コードの重複チェック
    const { exists } = await checkTaxCodeExists(result.data.taxCode);
    if (exists) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "この税区分コードは既に使用されています",
          details: {
            fieldErrors: { taxCode: ["この税区分コードは既に使用されています"] },
            retryable: false,
          },
        },
      };
    }

    // データベース登録
    const taxRate = await prisma.taxRate.create({
      data: {
        taxCode: result.data.taxCode,
        taxName: result.data.taxName,
        taxRate: result.data.taxRate,
        sortOrder: result.data.sortOrder || null,
        isActive: data.isActive,
      },
    });

    // TaxRateForClient型に変換してから返す
    const taxRateForClient: TaxRateForClient = {
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    };

    // キャッシュクリア
    revalidatePath("/master/tax-rates");
    revalidatePath("/master");
    return { success: true, data: taxRateForClient };
  } catch (error) {
    return handleServerActionError(error, "税区分の作成", "税区分");
  }
}

/**
 * 税区分の更新
 */
export async function updateTaxRate(
  taxCode: string,
  formData: FormData,
): Promise<ActionResult<TaxRateForClient>> {
  try {
    // FormDataから全フィールドを取得
    const data = {
      taxName: formData.get("taxName") as string,
      taxRate: (() => {
        const taxRateStr = formData.get("taxRate") as string;
        const taxRateNum = parseFloat(taxRateStr);
        return isNaN(taxRateNum) ? 0 : taxRateNum;
      })(),
      isActive: formData.get("isActive") === "true",
      sortOrder: formData.get("sortOrder")
        ? parseInt(formData.get("sortOrder") as string)
        : null,
    };

    // バリデーション（updateSchemaに必要なフィールドのみ）
    const validationData = {
      taxName: data.taxName,
      taxRate: data.taxRate,
      sortOrder: data.sortOrder,
    };

    const result = updateTaxRateSchema.safeParse(validationData);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // データベース更新（全フィールドを更新）
    const taxRate = await prisma.taxRate.update({
      where: { taxCode },
      data: {
        taxName: data.taxName,
        taxRate: data.taxRate,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    // TaxRateForClient型に変換
    const taxRateForClient: TaxRateForClient = {
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    };

    // キャッシュクリア
    revalidatePath("/master/tax-rates");
    revalidatePath("/master");
    return { success: true, data: taxRateForClient };
  } catch (error) {
    return handleServerActionError(error, "税区分の更新", "税区分");
  }
}

/**
 * 税区分の削除（物理削除）
 */
export async function deleteTaxRate(
  taxCode: string,
): Promise<ActionResult> {
  try {
    // 使用中チェック：勘定科目で使用されているかチェック
    const accountsUsingTaxRate = await prisma.account.findMany({
      where: { defaultTaxCode: taxCode },
      select: { accountCode: true, accountName: true },
    });

    if (accountsUsingTaxRate.length > 0) {
      const accountNames = accountsUsingTaxRate.map(account => 
        `${account.accountCode}: ${account.accountName}`
      ).join(", ");
      
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: `この税区分は以下の勘定科目で使用されているため削除できません: ${accountNames}`,
          details: {
            retryable: false,
          },
        },
      };
    }

    // 使用中チェック：仕訳明細で使用されているかチェック
    const journalDetailsUsingTaxRate = await prisma.journalDetail.findFirst({
      where: { taxCode: taxCode },
      select: { journalNumber: true, lineNumber: true },
    });

    if (journalDetailsUsingTaxRate) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "この税区分は仕訳で使用されているため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 物理削除
    await prisma.taxRate.delete({
      where: { taxCode },
    });

    // キャッシュクリア
    revalidatePath("/master/tax-rates");
    revalidatePath("/master");
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "税区分の削除", "税区分");
  }
}

/**
 * 税区分の検索（完全camelCase対応）
 */
export async function searchTaxRates(
  searchTerm: string,
  filters: { isActive?: boolean; taxRate?: string } = {},
): Promise<ActionResult<TaxRateForClient[]>> {
  try {
    const whereConditions: Record<string, unknown> = {
      isActive: filters.isActive !== undefined ? filters.isActive : true,
      ...(searchTerm && {
        OR: [
          { taxCode: { contains: searchTerm, mode: "insensitive" } },
          { taxName: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
    };

    // 税率フィルタの追加
    if (filters.taxRate) {
      if (filters.taxRate === "0") {
        whereConditions.taxRate = 0;
      } else if (filters.taxRate === "8") {
        whereConditions.taxRate = 8;
      } else if (filters.taxRate === "10") {
        whereConditions.taxRate = 10;
      } else if (filters.taxRate === "other") {
        whereConditions.taxRate = {
          notIn: [0, 8, 10],
        };
      }
    }

    const taxRates = await prisma.taxRate.findMany({
      where: whereConditions,
      orderBy: [
        { sortOrder: "asc" },
        { taxCode: "asc" }
      ],
    });

    // Decimal型をnumber型に変換、日時を日本時間に変換
    const taxRatesForClient: TaxRateForClient[] = taxRates.map((taxRate) => ({
      ...taxRate,
      taxRate: taxRate.taxRate.toNumber(),
      createdAt: toJST(taxRate.createdAt),
      updatedAt: toJST(taxRate.updatedAt),
    }));

    return { success: true, data: taxRatesForClient };
  } catch (error) {
    return handleServerActionError(error, "税区分の検索", "税区分");
  }
}

/**
 * アクティブな税区分一覧の取得（選択肢用）
 */
export async function getActiveTaxRates(): Promise<
  ActionResult<{ taxCode: string; taxName: string; taxRate: number }[]>
> {
  try {
    const taxRates = await prisma.taxRate.findMany({
      where: { isActive: true },
      select: {
        taxCode: true,
        taxName: true,
        taxRate: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { taxCode: "asc" }
      ],
    });

    // Decimal型をnumber型に変換
    const taxRatesForClient = taxRates.map((taxRate) => ({
      taxCode: taxRate.taxCode,
      taxName: taxRate.taxName,
      taxRate: taxRate.taxRate.toNumber(),
    }));

    return { success: true, data: taxRatesForClient };
  } catch (error) {
    return handleServerActionError(error, "アクティブ税区分の取得", "税区分");
  }
}