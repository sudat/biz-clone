"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createAccountSchema, updateAccountSchema } from "@/lib/schemas/master";
import type { Account } from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

// ====================
// 勘定科目のシンプルなServer Actions
// ====================

// Client Component用の勘定科目型
export type AccountForClient = Account & {
  defaultTaxRate?: {
    taxCode: string;
    taxName: string;
    taxRate: number;
  } | null;
};

/**
 * 勘定科目一覧の取得（完全camelCase対応・Decimal型変換）
 */
export async function getAccounts(): Promise<
  { success: boolean; data?: AccountForClient[]; error?: string }
> {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        defaultTaxRate: true,
      },
      orderBy: { accountCode: "asc" },
    });

    // 税区分データの変換、日時を日本時間に変換
    const accountsForClient: AccountForClient[] = accounts.map((account) => ({
      ...account,
      defaultTaxRate: account.defaultTaxRate
        ? {
          taxCode: account.defaultTaxRate.taxCode,
          taxName: account.defaultTaxRate.taxName,
          taxRate: account.defaultTaxRate.taxRate.toNumber(),
        }
        : null,
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
export async function checkAccountCodeExists(
  accountCode: string,
): Promise<{ exists: boolean; account?: Partial<Account> }> {
  try {
    const existingAccount = await prisma.account.findUnique({
      where: { accountCode },
      select: {
        accountCode: true,
        accountName: true,
        accountType: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingAccount,
      account: existingAccount || undefined,
    };
  } catch (error) {
    console.error("勘定科目コード重複チェックエラー:", error);
    return { exists: false };
  }
}

export async function createAccount(
  formData: FormData,
): Promise<ActionResult<Account>> {
  const data = {
    accountCode: formData.get("accountCode") as string,
    accountName: formData.get("accountName") as string,
    accountType: formData.get("accountType") as string,
    defaultTaxCode: formData.get("defaultTaxCode") as string || null,
  };

  try {
    // バリデーション
    const result = createAccountSchema.safeParse(data);
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

    // BS/PL科目に基づくデフォルト税区分の設定
    let defaultTaxCode = data.defaultTaxCode;
    if (!defaultTaxCode) {
      // BS科目（資産・負債・純資産）→ 不課税(TAX0)
      if (["資産", "負債", "純資産"].includes(data.accountType)) {
        defaultTaxCode = "TAX0";
      } // PL科目（収益・費用）→ 課税(TAX10)
      else if (["収益", "費用"].includes(data.accountType)) {
        defaultTaxCode = "TAX10";
      }
    }

    // データベース登録
    const account = await prisma.account.create({
      data: {
        accountCode: result.data.accountCode,
        accountName: result.data.accountName,
        accountType: result.data.accountType,
        defaultTaxCode: defaultTaxCode,
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
export async function updateAccount(
  accountCode: string,
  formData: FormData,
): Promise<ActionResult<AccountForClient>> {
  try {
    // FormDataから全フィールドを取得
    const data = {
      accountName: formData.get("accountName") as string,
      accountType: formData.get("accountType") as string,
      parentAccountCode: formData.get("parentAccountCode") as string || null,
      isDetail: formData.get("isDetail") === "true",
      isActive: formData.get("isActive") === "true",
      sortOrder: formData.get("sortOrder")
        ? parseInt(formData.get("sortOrder") as string)
        : null,
      defaultTaxCode: formData.get("defaultTaxCode") as string || null,
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
    const account = await prisma.account.update({
      where: { accountCode },
      data: {
        accountName: data.accountName,
        accountType: data.accountType,
        parentAccountCode: data.parentAccountCode,
        isDetail: data.isDetail,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        defaultTaxCode: data.defaultTaxCode,
      },
      include: {
        defaultTaxRate: true,
      },
    });

    // AccountForClient型に変換
    const accountForClient: AccountForClient = {
      ...account,
      defaultTaxRate: account.defaultTaxRate
        ? {
          taxCode: account.defaultTaxRate.taxCode,
          taxName: account.defaultTaxRate.taxName,
          taxRate: account.defaultTaxRate.taxRate.toNumber(),
        }
        : null,
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
export async function deleteAccount(
  accountCode: string,
): Promise<ActionResult> {
  try {
    // 削除前に関連データの存在チェック
    const [subAccountCount, journalDetailCount] = await Promise.all([
      // 補助科目の存在チェック
      prisma.subAccount.count({
        where: { accountCode },
      }),
      // 仕訳明細の存在チェック
      prisma.journalDetail.count({
        where: { accountCode },
      }),
    ]);

    // 関連データが存在する場合は削除を拒否
    if (subAccountCount > 0 || journalDetailCount > 0) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "この勘定科目は使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 物理削除を実行
    await prisma.account.delete({
      where: { accountCode },
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
      include: {
        defaultTaxRate: true,
      },
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

    // 税区分データの変換、日時を日本時間に変換
    const accountsForClient: AccountForClient[] = accounts.map((account) => ({
      ...account,
      defaultTaxRate: account.defaultTaxRate
        ? {
          taxCode: account.defaultTaxRate.taxCode,
          taxName: account.defaultTaxRate.taxName,
          taxRate: account.defaultTaxRate.taxRate.toNumber(),
        }
        : null,
      createdAt: toJST(account.createdAt),
      updatedAt: toJST(account.updatedAt),
    }));

    return { success: true, data: accountsForClient };
  } catch (error) {
    console.error("勘定科目検索エラー:", error);
    return { success: false, error: "勘定科目の検索に失敗しました" };
  }
}
