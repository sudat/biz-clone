"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createAccountSchema, updateAccountSchema } from "@/lib/schemas/master";
import type { Account } from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

// ====================
// 勘定科目のシンプルなServer Actions
// ====================

// Client Component用の勘定科目型（Decimal型をnumber型に変換）
export type AccountForClient = Omit<Account, 'defaultTaxRate'> & {
  defaultTaxRate: number | null;
};

/**
 * 勘定科目一覧の取得（完全camelCase対応・Decimal型変換）
 */
export async function getAccounts(): Promise<
  { success: boolean; data?: AccountForClient[]; error?: string }
> {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { accountCode: "asc" },
    });

    // Decimal型をnumber型に変換、日時を日本時間に変換
    const accountsForClient: AccountForClient[] = accounts.map(account => ({
      ...account,
      defaultTaxRate: account.defaultTaxRate ? account.defaultTaxRate.toNumber() : null,
      createdAt: toJST(account.createdAt),
      updatedAt: toJST(account.updatedAt),
    }));

    return { success: true, data: accountsForClient };
  } catch (error) {
    console.error("勘定科目取得エラー:", error);
    return { success: false, error: "勘定科目の取得に失敗しました" };
  }
}

/**
 * 勘定科目の作成
 */
/**
 * 勘定科目コードの重複チェック
 */
export async function checkAccountCodeExists(accountCode: string): Promise<{ exists: boolean; account?: any }> {
  try {
    const existingAccount = await prisma.account.findUnique({
      where: { accountCode },
      select: {
        accountCode: true,
        accountName: true,
        accountType: true,
        isActive: true
      }
    });

    return {
      exists: !!existingAccount,
      account: existingAccount || undefined
    };
  } catch (error) {
    console.error("勘定科目コード重複チェックエラー:", error);
    return { exists: false };
  }
}

export async function createAccount(formData: FormData): Promise<ActionResult<Account>> {
  const data = {
    accountCode: formData.get("accountCode") as string,
    accountName: formData.get("accountName") as string,
    accountType: formData.get("accountType") as string,
  };

  try {
    // バリデーション
    const result = createAccountSchema.safeParse(data);
    if (!result.success) {
      return { 
        success: false, 
        error: {
          type: "validation" as const,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false
          }
        }
      };
    }

    // データベース登録
    const account = await prisma.account.create({
      data: {
        accountCode: result.data.accountCode,
        accountName: result.data.accountName,
        accountType: result.data.accountType,
        isActive: true,
      },
    });

    revalidatePath("/master/accounts");
    return { success: true, data: account };
  } catch (error) {
    return handleServerActionError(error, "勘定科目の作成", "勘定科目");
  }
}

/**
 * 勘定科目の更新
 */
export async function updateAccount(accountCode: string, formData: FormData): Promise<ActionResult<AccountForClient>> {
  try {
    // FormDataから全フィールドを取得
    const data = {
      accountName: formData.get("accountName") as string,
      accountType: formData.get("accountType") as string,
      parentAccountCode: formData.get("parentAccountCode") as string || null,
      isDetail: formData.get("isDetail") === "true",
      isActive: formData.get("isActive") === "true",
      sortOrder: formData.get("sortOrder") ? parseInt(formData.get("sortOrder") as string) : null,
    };

    // バリデーション（updateSchemaに必要なフィールドのみ）
    const validationData = {
      accountName: data.accountName,
      accountType: data.accountType,
      sortOrder: data.sortOrder,
    };
    
    const result = updateAccountSchema.safeParse(validationData);
    if (!result.success) {
      return { 
        success: false, 
        error: {
          type: "validation" as const,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false
          }
        }
      };
    }

    // データベース更新（全フィールドを更新）
    const account = await prisma.account.update({
      where: { accountCode },
      data: {
        accountName: data.accountName,
        accountType: data.accountType,
        parentAccountCode: data.parentAccountCode,
        isDetail: data.isDetail,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    // AccountForClient型に変換（Decimal型を処理）
    const accountForClient: AccountForClient = {
      ...account,
      defaultTaxRate: account.defaultTaxRate ? account.defaultTaxRate.toNumber() : null,
    };

    revalidatePath("/master/accounts");
    return { success: true, data: accountForClient };
  } catch (error) {
    return handleServerActionError(error, "勘定科目の更新", "勘定科目");
  }
}

/**
 * 勘定科目の削除
 */
export async function deleteAccount(accountCode: string): Promise<ActionResult> {
  try {
    // 論理削除
    await prisma.account.update({
      where: { accountCode },
      data: { isActive: false },
    });

    revalidatePath("/master/accounts");
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "勘定科目の削除", "勘定科目");
  }
}

/**
 * 勘定科目の検索（完全camelCase対応・Decimal型変換）
 */
export async function searchAccounts(
  searchTerm: string,
  filters: { accountType?: string; isActive?: boolean } = {},
): Promise<{ success: boolean; data?: AccountForClient[]; error?: string }> {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { accountCode: { contains: searchTerm, mode: "insensitive" } },
            { accountName: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
        ...(filters.accountType && {
          accountType: filters.accountType,
        }),
      },
      orderBy: { accountCode: "asc" },
    });

    // Decimal型をnumber型に変換、日時を日本時間に変換
    const accountsForClient: AccountForClient[] = accounts.map(account => ({
      ...account,
      defaultTaxRate: account.defaultTaxRate ? account.defaultTaxRate.toNumber() : null,
      createdAt: toJST(account.createdAt),
      updatedAt: toJST(account.updatedAt),
    }));

    return { success: true, data: accountsForClient };
  } catch (error) {
    console.error("勘定科目検索エラー:", error);
    return { success: false, error: "勘定科目の検索に失敗しました" };
  }
}
