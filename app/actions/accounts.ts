"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createAccountSchema, updateAccountSchema } from "@/lib/schemas/master";
import type { Account } from "@/lib/database/prisma";

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
      where: { isActive: true },
      orderBy: { accountCode: "asc" },
    });

    // Decimal型をnumber型に変換
    const accountsForClient: AccountForClient[] = accounts.map(account => ({
      ...account,
      defaultTaxRate: account.defaultTaxRate ? account.defaultTaxRate.toNumber() : null,
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
export async function createAccount(formData: FormData) {
  try {
    const data = {
      accountCode: formData.get("accountCode") as string,
      accountName: formData.get("accountName") as string,
      accountType: formData.get("accountType") as string,
    };

    // バリデーション
    const result = createAccountSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: "入力値が正しくありません" };
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
    console.error("勘定科目作成エラー:", error);
    return { success: false, error: "勘定科目の作成に失敗しました" };
  }
}

/**
 * 勘定科目の更新
 */
export async function updateAccount(accountCode: string, formData: FormData) {
  try {
    const data = {
      accountName: formData.get("accountName") as string,
      accountType: formData.get("accountType") as string,
    };

    // バリデーション
    const result = updateAccountSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: "入力値が正しくありません" };
    }

    // データベース更新
    const account = await prisma.account.update({
      where: { accountCode },
      data: result.data,
    });

    revalidatePath("/master/accounts");
    return { success: true, data: account };
  } catch (error) {
    console.error("勘定科目更新エラー:", error);
    return { success: false, error: "勘定科目の更新に失敗しました" };
  }
}

/**
 * 勘定科目の削除
 */
export async function deleteAccount(accountCode: string) {
  try {
    // 論理削除
    await prisma.account.update({
      where: { accountCode },
      data: { isActive: false },
    });

    revalidatePath("/master/accounts");
    return { success: true };
  } catch (error) {
    console.error("勘定科目削除エラー:", error);
    return { success: false, error: "勘定科目の削除に失敗しました" };
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

    // Decimal型をnumber型に変換
    const accountsForClient: AccountForClient[] = accounts.map(account => ({
      ...account,
      defaultTaxRate: account.defaultTaxRate ? account.defaultTaxRate.toNumber() : null,
    }));

    return { success: true, data: accountsForClient };
  } catch (error) {
    console.error("勘定科目検索エラー:", error);
    return { success: false, error: "勘定科目の検索に失敗しました" };
  }
}
