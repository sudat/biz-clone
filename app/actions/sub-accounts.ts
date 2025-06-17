"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import {
  createSubAccountSchema,
  updateSubAccountSchema,
} from "@/lib/schemas/master";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";

/**
 * 補助科目コードの重複チェック
 */
export async function checkSubAccountCodeExists(
  accountCode: string,
  subAccountCode: string,
): Promise<{ exists: boolean; subAccount?: any }> {
  try {
    const existingSubAccount = await prisma.subAccount.findUnique({
      where: {
        accountCode_subAccountCode: {
          accountCode,
          subAccountCode,
        },
      },
      select: {
        subAccountCode: true,
        subAccountName: true,
        isActive: true,
        account: {
          select: {
            accountName: true,
          },
        },
      },
    });

    return {
      exists: !!existingSubAccount,
      subAccount: existingSubAccount || undefined,
    };
  } catch (error) {
    console.error("補助科目コード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * 補助科目一覧の取得
 */
export async function getSubAccounts() {
  try {
    const subAccounts = await prisma.subAccount.findMany({
      where: { isActive: true },
      include: {
        account: {
          select: {
            accountCode: true,
            accountName: true,
          },
        },
      },
      orderBy: [
        { accountCode: "asc" },
        { subAccountCode: "asc" },
      ],
    });

    return { success: true, data: subAccounts };
  } catch (error) {
    console.error("補助科目取得エラー:", error);
    return { success: false, error: "補助科目の取得に失敗しました" };
  }
}

/**
 * 補助科目の作成
 */
export async function createSubAccount(formData: FormData) {
  try {
    const data = {
      accountCode: formData.get("accountCode") as string,
      subAccountCode: formData.get("subAccountCode") as string,
      subAccountName: formData.get("subAccountName") as string,
    };

    const result = createSubAccountSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: "入力値が正しくありません" };
    }

    const subAccount = await prisma.subAccount.create({
      data: {
        ...result.data,
        isActive: true,
      },
      include: {
        account: {
          select: {
            accountCode: true,
            accountName: true,
          },
        },
      },
    });

    revalidatePath("/master/sub-accounts");
    return { success: true, data: subAccount };
  } catch (error) {
    console.error("補助科目作成エラー:", error);
    return { success: false, error: "補助科目の作成に失敗しました" };
  }
}

/**
 * 補助科目の更新
 */
export async function updateSubAccount(
  accountCode: string,
  subAccountCode: string,
  formData: FormData,
) {
  try {
    const data = {
      subAccountName: formData.get("subAccountName") as string,
    };

    const result = updateSubAccountSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: "入力値が正しくありません" };
    }

    const subAccount = await prisma.subAccount.update({
      where: {
        accountCode_subAccountCode: {
          accountCode,
          subAccountCode,
        },
      },
      data: result.data,
      include: {
        account: {
          select: {
            accountCode: true,
            accountName: true,
          },
        },
      },
    });

    revalidatePath("/master/sub-accounts");
    return { success: true, data: subAccount };
  } catch (error) {
    console.error("補助科目更新エラー:", error);
    return { success: false, error: "補助科目の更新に失敗しました" };
  }
}

/**
 * 補助科目の削除
 */
export async function deleteSubAccount(
  accountCode: string,
  subAccountCode: string,
): Promise<ActionResult> {
  try {
    // 削除前に関連データの存在チェック
    const relatedJournalDetails = await prisma.journalDetail.findFirst({
      where: {
        accountCode,
        subAccountCode,
      },
      select: { journalNumber: true, lineNumber: true },
    });

    // 関連データが存在する場合は削除を拒否
    if (relatedJournalDetails) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "この補助科目は使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 物理削除を実行
    await prisma.subAccount.delete({
      where: {
        accountCode_subAccountCode: {
          accountCode,
          subAccountCode,
        },
      },
    });

    revalidatePath("/master/sub-accounts");
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "補助科目の削除", "補助科目");
  }
}

/**
 * 補助科目の検索
 */
export async function searchSubAccounts(
  searchTerm: string,
  filters: Record<string, any> = {},
) {
  try {
    const subAccounts = await prisma.subAccount.findMany({
      where: {
        isActive: filters.is_active !== undefined ? filters.is_active : true,
        ...(searchTerm && {
          OR: [
            { subAccountCode: { contains: searchTerm, mode: "insensitive" } },
            { subAccountName: { contains: searchTerm, mode: "insensitive" } },
            {
              account: {
                accountName: { contains: searchTerm, mode: "insensitive" },
              },
            },
          ],
        }),
        ...(filters.account_code && {
          accountCode: filters.account_code,
        }),
      },
      include: {
        account: {
          select: {
            accountCode: true,
            accountName: true,
          },
        },
      },
      orderBy: [
        { accountCode: "asc" },
        { subAccountCode: "asc" },
      ],
    });

    return { success: true, data: subAccounts };
  } catch (error) {
    console.error("補助科目検索エラー:", error);
    return { success: false, error: "補助科目の検索に失敗しました" };
  }
}
