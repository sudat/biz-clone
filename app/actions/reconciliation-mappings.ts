"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import type { ReconciliationMapping } from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

// ====================
// 勘定照合マスタのシンプルなServer Actions
// ====================

// Client Component用の勘定照合マスタ型
export type ReconciliationMappingForClient = ReconciliationMapping & {
  departmentName?: string;
  accountName?: string;
  counterDepartmentName?: string;
  counterAccountName?: string;
};

/**
 * 勘定照合マスタ一覧の取得
 */
export async function getReconciliationMappings(): Promise<
  { success: boolean; data?: ReconciliationMappingForClient[]; error?: string }
> {
  try {
    const mappings = await prisma.reconciliationMapping.findMany({
      orderBy: [
        { departmentCode: "asc" },
        { accountCode: "asc" },
        { counterDepartmentCode: "asc" },
        { counterAccountCode: "asc" },
      ],
    });

    // 関連データを別途取得してマージ
    const mappingsWithNames = await Promise.all(
      mappings.map(async (mapping) => {
        const [department, account, counterDepartment, counterAccount] = await Promise.all([
          prisma.department.findUnique({
            where: { departmentCode: mapping.departmentCode },
            select: { departmentName: true },
          }),
          prisma.account.findUnique({
            where: { accountCode: mapping.accountCode },
            select: { accountName: true },
          }),
          prisma.department.findUnique({
            where: { departmentCode: mapping.counterDepartmentCode },
            select: { departmentName: true },
          }),
          prisma.account.findUnique({
            where: { accountCode: mapping.counterAccountCode },
            select: { accountName: true },
          }),
        ]);

        return {
          ...mapping,
          departmentName: department?.departmentName,
          accountName: account?.accountName,
          counterDepartmentName: counterDepartment?.departmentName,
          counterAccountName: counterAccount?.accountName,
          createdAt: toJST(mapping.createdAt),
          updatedAt: toJST(mapping.updatedAt),
        };
      })
    );

    return { success: true, data: mappingsWithNames };
  } catch (error) {
    console.error("勘定照合マスタ取得エラー:", error);
    return { success: false, error: "勘定照合マスタの取得に失敗しました" };
  }
}

/**
 * 勘定照合マスタの重複チェック
 */
export async function checkReconciliationMappingExists(
  departmentCode: string,
  accountCode: string,
  counterDepartmentCode: string,
  counterAccountCode: string,
  excludeMappingId?: string
): Promise<{ exists: boolean; mapping?: Partial<ReconciliationMapping> }> {
  try {
    const existingMapping = await prisma.reconciliationMapping.findFirst({
      where: {
        departmentCode,
        accountCode,
        counterDepartmentCode,
        counterAccountCode,
        ...(excludeMappingId && {
          mappingId: { not: excludeMappingId },
        }),
      },
      select: {
        mappingId: true,
        departmentCode: true,
        accountCode: true,
        counterDepartmentCode: true,
        counterAccountCode: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingMapping,
      mapping: existingMapping || undefined,
    };
  } catch (error) {
    console.error("勘定照合マスタ重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * 勘定照合マスタの作成
 */
export async function createReconciliationMapping(
  formData: FormData,
): Promise<ActionResult<ReconciliationMapping>> {
  const data = {
    departmentCode: formData.get("departmentCode") as string,
    accountCode: formData.get("accountCode") as string,
    counterDepartmentCode: formData.get("counterDepartmentCode") as string,
    counterAccountCode: formData.get("counterAccountCode") as string,
    description: formData.get("description") as string || null,
  };

  try {
    // 基本バリデーション
    if (!data.departmentCode || !data.accountCode || !data.counterDepartmentCode || !data.counterAccountCode) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "すべての必須フィールドを入力してください",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 重複チェック
    const { exists } = await checkReconciliationMappingExists(
      data.departmentCode,
      data.accountCode,
      data.counterDepartmentCode,
      data.counterAccountCode
    );

    if (exists) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "同じ組み合わせの勘定照合マスタが既に存在します",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 部門・勘定科目の存在チェック
    const [department, account, counterDepartment, counterAccount] = await Promise.all([
      prisma.department.findUnique({ where: { departmentCode: data.departmentCode } }),
      prisma.account.findUnique({ where: { accountCode: data.accountCode } }),
      prisma.department.findUnique({ where: { departmentCode: data.counterDepartmentCode } }),
      prisma.account.findUnique({ where: { accountCode: data.counterAccountCode } }),
    ]);

    if (!department) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: `計上部門コード「${data.departmentCode}」が存在しません`,
          details: { retryable: false },
        },
      };
    }

    if (!account) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: `勘定科目コード「${data.accountCode}」が存在しません`,
          details: { retryable: false },
        },
      };
    }

    if (!counterDepartment) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: `相手計上部門コード「${data.counterDepartmentCode}」が存在しません`,
          details: { retryable: false },
        },
      };
    }

    if (!counterAccount) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: `相手勘定科目コード「${data.counterAccountCode}」が存在しません`,
          details: { retryable: false },
        },
      };
    }

    // データベース登録
    const mapping = await prisma.reconciliationMapping.create({
      data: {
        departmentCode: data.departmentCode,
        accountCode: data.accountCode,
        counterDepartmentCode: data.counterDepartmentCode,
        counterAccountCode: data.counterAccountCode,
        description: data.description,
        isActive: true,
      },
    });

    revalidatePath("/master/reconciliation-mappings");

    return { success: true, data: mapping };
  } catch (error) {
    return handleServerActionError(error, "勘定照合マスタの作成", "勘定照合マスタ");
  }
}

/**
 * 勘定照合マスタの更新
 */
export async function updateReconciliationMapping(
  mappingId: string,
  formData: FormData,
): Promise<ActionResult<ReconciliationMapping>> {
  try {
    const data = {
      departmentCode: formData.get("departmentCode") as string,
      accountCode: formData.get("accountCode") as string,
      counterDepartmentCode: formData.get("counterDepartmentCode") as string,
      counterAccountCode: formData.get("counterAccountCode") as string,
      description: formData.get("description") as string || null,
      isActive: formData.get("isActive") === "true",
    };

    // 基本バリデーション
    if (!data.departmentCode || !data.accountCode || !data.counterDepartmentCode || !data.counterAccountCode) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "すべての必須フィールドを入力してください",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 重複チェック（自分以外）
    const { exists } = await checkReconciliationMappingExists(
      data.departmentCode,
      data.accountCode,
      data.counterDepartmentCode,
      data.counterAccountCode,
      mappingId
    );

    if (exists) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "同じ組み合わせの勘定照合マスタが既に存在します",
          details: {
            retryable: false,
          },
        },
      };
    }

    // データベース更新
    const mapping = await prisma.reconciliationMapping.update({
      where: { mappingId },
      data: {
        departmentCode: data.departmentCode,
        accountCode: data.accountCode,
        counterDepartmentCode: data.counterDepartmentCode,
        counterAccountCode: data.counterAccountCode,
        description: data.description,
        isActive: data.isActive,
      },
    });

    revalidatePath("/master/reconciliation-mappings");

    return { success: true, data: mapping };
  } catch (error) {
    return handleServerActionError(error, "勘定照合マスタの更新", "勘定照合マスタ");
  }
}

/**
 * 勘定照合マスタの削除
 */
export async function deleteReconciliationMapping(
  mappingId: string,
): Promise<ActionResult> {
  try {
    // 物理削除を実行（関連データのチェックは省略）
    await prisma.reconciliationMapping.delete({
      where: { mappingId },
    });

    revalidatePath("/master/reconciliation-mappings");
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "勘定照合マスタの削除", "勘定照合マスタ");
  }
}

/**
 * 勘定照合マスタの検索
 */
export async function searchReconciliationMappings(
  searchTerm: string,
  filters: {
    departmentCode?: string;
    accountCode?: string;
    counterDepartmentCode?: string;
    counterAccountCode?: string;
    isActive?: boolean;
  } = {},
): Promise<{ success: boolean; data?: ReconciliationMappingForClient[]; error?: string }> {
  try {
    const mappings = await prisma.reconciliationMapping.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { departmentCode: { contains: searchTerm, mode: "insensitive" } },
            { accountCode: { contains: searchTerm, mode: "insensitive" } },
            { counterDepartmentCode: { contains: searchTerm, mode: "insensitive" } },
            { counterAccountCode: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
        ...(filters.departmentCode && {
          departmentCode: filters.departmentCode,
        }),
        ...(filters.accountCode && {
          accountCode: filters.accountCode,
        }),
        ...(filters.counterDepartmentCode && {
          counterDepartmentCode: filters.counterDepartmentCode,
        }),
        ...(filters.counterAccountCode && {
          counterAccountCode: filters.counterAccountCode,
        }),
      },
      orderBy: [
        { departmentCode: "asc" },
        { accountCode: "asc" },
        { counterDepartmentCode: "asc" },
        { counterAccountCode: "asc" },
      ],
    });

    // 関連データを別途取得してマージ
    const mappingsWithNames = await Promise.all(
      mappings.map(async (mapping) => {
        const [department, account, counterDepartment, counterAccount] = await Promise.all([
          prisma.department.findUnique({
            where: { departmentCode: mapping.departmentCode },
            select: { departmentName: true },
          }),
          prisma.account.findUnique({
            where: { accountCode: mapping.accountCode },
            select: { accountName: true },
          }),
          prisma.department.findUnique({
            where: { departmentCode: mapping.counterDepartmentCode },
            select: { departmentName: true },
          }),
          prisma.account.findUnique({
            where: { accountCode: mapping.counterAccountCode },
            select: { accountName: true },
          }),
        ]);

        return {
          ...mapping,
          departmentName: department?.departmentName,
          accountName: account?.accountName,
          counterDepartmentName: counterDepartment?.departmentName,
          counterAccountName: counterAccount?.accountName,
          createdAt: toJST(mapping.createdAt),
          updatedAt: toJST(mapping.updatedAt),
        };
      })
    );

    return { success: true, data: mappingsWithNames };
  } catch (error) {
    console.error("勘定照合マスタ検索エラー:", error);
    return { success: false, error: "勘定照合マスタの検索に失敗しました" };
  }
}

/**
 * 部門一覧の取得（選択用）
 */
export async function getDepartments(): Promise<
  { success: boolean; data?: { departmentCode: string; departmentName: string }[]; error?: string }
> {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        departmentCode: true,
        departmentName: true,
      },
      orderBy: { departmentCode: "asc" },
    });

    return { success: true, data: departments };
  } catch (error) {
    console.error("部門一覧取得エラー:", error);
    return { success: false, error: "部門一覧の取得に失敗しました" };
  }
}

/**
 * 勘定科目一覧の取得（選択用）
 */
export async function getAccountsForSelection(): Promise<
  { success: boolean; data?: { accountCode: string; accountName: string }[]; error?: string }
> {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: {
        accountCode: true,
        accountName: true,
      },
      orderBy: { accountCode: "asc" },
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error("勘定科目一覧取得エラー:", error);
    return { success: false, error: "勘定科目一覧の取得に失敗しました" };
  }
}