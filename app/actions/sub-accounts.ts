"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createSubAccountSchema, updateSubAccountSchema } from "@/lib/schemas/master";
import type { SubAccount } from "@/lib/database/prisma";

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
          }
        }
      },
      orderBy: [
        { accountCode: 'asc' },
        { subAccountCode: 'asc' }
      ]
    });
    
    return { success: true, data: subAccounts };
  } catch (error) {
    console.error('補助科目取得エラー:', error);
    return { success: false, error: '補助科目の取得に失敗しました' };
  }
}

/**
 * 補助科目の作成
 */
export async function createSubAccount(formData: FormData) {
  try {
    const data = {
      accountCode: formData.get('accountCode') as string,
      subAccountCode: formData.get('subAccountCode') as string,
      subAccountName: formData.get('subAccountName') as string,
    };

    const result = createSubAccountSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: '入力値が正しくありません' };
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
          }
        }
      }
    });

    revalidatePath('/master/sub-accounts');
    return { success: true, data: subAccount };
  } catch (error) {
    console.error('補助科目作成エラー:', error);
    return { success: false, error: '補助科目の作成に失敗しました' };
  }
}

/**
 * 補助科目の更新
 */
export async function updateSubAccount(accountCode: string, subAccountCode: string, formData: FormData) {
  try {
    const data = {
      subAccountName: formData.get('subAccountName') as string,
    };

    const result = updateSubAccountSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: '入力値が正しくありません' };
    }

    const subAccount = await prisma.subAccount.update({
      where: { 
        accountCode_subAccountCode: {
          accountCode,
          subAccountCode
        }
      },
      data: result.data,
      include: {
        account: {
          select: {
            accountCode: true,
            accountName: true,
          }
        }
      }
    });

    revalidatePath('/master/sub-accounts');
    return { success: true, data: subAccount };
  } catch (error) {
    console.error('補助科目更新エラー:', error);
    return { success: false, error: '補助科目の更新に失敗しました' };
  }
}

/**
 * 補助科目の削除
 */
export async function deleteSubAccount(accountCode: string, subAccountCode: string) {
  try {
    await prisma.subAccount.update({
      where: { 
        accountCode_subAccountCode: {
          accountCode,
          subAccountCode
        }
      },
      data: { isActive: false }
    });

    revalidatePath('/master/sub-accounts');
    return { success: true };
  } catch (error) {
    console.error('補助科目削除エラー:', error);
    return { success: false, error: '補助科目の削除に失敗しました' };
  }
}

/**
 * 補助科目の検索
 */
export async function searchSubAccounts(searchTerm: string, filters: Record<string, any> = {}) {
  try {
    const subAccounts = await prisma.subAccount.findMany({
      where: {
        isActive: filters.is_active !== undefined ? filters.is_active : true,
        ...(searchTerm && {
          OR: [
            { subAccountCode: { contains: searchTerm, mode: 'insensitive' } },
            { subAccountName: { contains: searchTerm, mode: 'insensitive' } },
            { account: { accountName: { contains: searchTerm, mode: 'insensitive' } } },
          ]
        }),
        ...(filters.account_code && {
          accountCode: filters.account_code
        })
      },
      include: {
        account: {
          select: {
            accountCode: true,
            accountName: true,
          }
        }
      },
      orderBy: [
        { accountCode: 'asc' },
        { subAccountCode: 'asc' }
      ]
    });
    
    return { success: true, data: subAccounts };
  } catch (error) {
    console.error('補助科目検索エラー:', error);
    return { success: false, error: '補助科目の検索に失敗しました' };
  }
}