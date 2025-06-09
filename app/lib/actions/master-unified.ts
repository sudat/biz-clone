/**
 * 統一されたマスタデータ Server Actions
 * ============================================================================
 * 新しいRepository/Service層を使用する統一Server Actions
 * 既存のmaster-prisma.tsからの段階的移行用
 * ============================================================================
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { getDataAccessLayer } from "@/lib/data-access";
import { ActionResult } from "@/lib/types/errors";
import { 
  handleServerActionError as handleError,
  createFormValidationError 
} from "@/lib/utils/error-handler";

// 新しい統一スキーマのインポート
import {
  createAccountSchema,
  updateAccountSchema,
  createSubAccountSchema,
  updateSubAccountSchema,
  createPartnerSchema,
  updatePartnerSchema,
  createAnalysisCodeSchema,
  updateAnalysisCodeSchema
} from "@/lib/schemas/master";

// 型変換ユーティリティ
import { snakeToCamel, camelToSnake } from "@/lib/utils/typeConverters";
import type { Account, AccountCreateDto, AccountUpdateDto } from "@/lib/repositories/interfaces/IAccountRepository";

// データアクセス層の初期化
const dataAccess = getDataAccessLayer(prisma);

// FormDataから入力値を抽出するヘルパー関数
function extractFormData(formData: FormData): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value === 'true') {
      data[key] = true;
    } else if (value === 'false') {
      data[key] = false;
    } else if (value === '' || value === 'null') {
      data[key] = null;
    } else if (key.includes('sortOrder') || key.includes('sort_order')) {
      data[key] = value ? Number(value) : null;
    } else {
      data[key] = value;
    }
  }
  return data;
}

/**
 * 勘定科目 Server Actions (新しいアーキテクチャ)
 */
export async function getAccountsWithPaginationUnifiedAction(
  filter: {
    accountType?: string;
    isActive?: boolean;
    search?: string;
  } = {},
  pagination: {
    page?: number;
    limit?: number;
  } = {}
) {
  try {
    const accountService = dataAccess.services.account;
    
    const searchOptions = {
      accountType: filter.accountType as Account['accountType'],
      isActive: filter.isActive,
      includeSubAccounts: true
    };

    const paginationOptions = {
      page: pagination.page || 1,
      limit: pagination.limit || 50
    };

    let result;
    if (filter.search) {
      result = await accountService.searchAccounts(
        filter.search,
        paginationOptions,
        searchOptions
      );
    } else {
      result = await accountService.getAccountsPaginated(
        paginationOptions,
        searchOptions
      );
    }

    // snake_caseに変換してフロントエンドに送信
    const convertedData = camelToSnake(result.data);
    
    return { 
      data: convertedData, 
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    };
  } catch (error) {
    console.error("勘定科目取得エラー:", error);
    return { error: "勘定科目の取得に失敗しました。" };
  }
}

export async function getAccountByCodeUnifiedAction(accountCode: string) {
  try {
    const accountService = dataAccess.services.account;
    const account = await accountService.getAccountWithSubAccounts(accountCode);
    
    if (!account) {
      return { error: "勘定科目が見つかりません。" };
    }

    // snake_caseに変換してフロントエンドに送信
    const convertedAccount = camelToSnake(account);
    
    return { data: convertedAccount };
  } catch (error) {
    console.error("勘定科目詳細取得エラー:", error);
    return { error: "勘定科目詳細の取得に失敗しました。" };
  }
}

export async function getAccountsHierarchyUnifiedAction() {
  try {
    const accountService = dataAccess.services.account;
    const hierarchy = await accountService.getAccountHierarchy();
    
    // snake_caseに変換してフロントエンドに送信
    const convertedHierarchy = camelToSnake(hierarchy);
    
    return { data: convertedHierarchy };
  } catch (error) {
    console.error("勘定科目階層取得エラー:", error);
    return { error: "勘定科目階層の取得に失敗しました。" };
  }
}

export async function createAccountUnifiedAction(formData: FormData): Promise<ActionResult<any>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = createAccountSchema.safeParse({
    account_code: rawFormData.accountCode,
    account_name: rawFormData.accountName,
    account_name_kana: rawFormData.accountNameKana || null,
    account_type: rawFormData.accountType,
    parent_account_code: rawFormData.parentAccountCode || null,
    is_detail: rawFormData.isDetail ?? true,
    is_active: rawFormData.isActive ?? true,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const data = validatedFields.data;
    
    // snake_caseからcamelCaseに変換（Service層向け）
    const accountData: AccountCreateDto = snakeToCamel(data);
    
    const accountService = dataAccess.services.account;
    const createdAccount = await accountService.createAccount(accountData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/accounts");
    redirect("/master/accounts");
    
  } catch (error) {
    return handleError(error, "勘定科目の作成", "勘定科目");
  }
}

export async function updateAccountUnifiedAction(
  accountCode: string,
  formData: FormData,
): Promise<ActionResult<any>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = updateAccountSchema.safeParse({
    account_code: accountCode,
    account_name: rawFormData.accountName,
    account_name_kana: rawFormData.accountNameKana || null,
    account_type: rawFormData.accountType,
    parent_account_code: rawFormData.parentAccountCode || null,
    is_detail: rawFormData.isDetail,
    is_active: rawFormData.isActive,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const data = validatedFields.data;
    
    // 不要なaccount_codeを除去
    const { account_code, ...updateFields } = data;
    
    // snake_caseからcamelCaseに変換（Service層向け）
    const accountData: AccountUpdateDto = snakeToCamel(updateFields);
    
    const accountService = dataAccess.services.account;
    await accountService.updateAccount(accountCode, accountData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/accounts");
    redirect("/master/accounts");
    
  } catch (error) {
    return handleError(error, "勘定科目の更新", "勘定科目");
  }
}

export async function deleteAccountUnifiedAction(
  accountCode: string,
): Promise<ActionResult<void>> {
  try {
    const accountService = dataAccess.services.account;
    await accountService.deleteAccount(accountCode);
    
    revalidatePath("/master/accounts");
    return { success: true };
  } catch (error) {
    return handleError(error, "勘定科目の削除", "勘定科目");
  }
}

/**
 * 勘定科目バリデーション用Action
 */
export async function validateAccountCodeUnifiedAction(accountCode: string) {
  try {
    const accountService = dataAccess.services.account;
    const validation = await accountService.validateAccountCode(accountCode);
    
    return {
      isValid: validation.isValid,
      message: validation.message
    };
  } catch (error) {
    console.error("勘定科目コード検証エラー:", error);
    return {
      isValid: false,
      message: "検証中にエラーが発生しました"
    };
  }
}

/**
 * 勘定科目使用状況レポート取得Action
 */
export async function getAccountUsageReportUnifiedAction(accountCode: string) {
  try {
    const accountService = dataAccess.services.account;
    const report = await accountService.getAccountUsageReport(accountCode);
    
    // snake_caseに変換してフロントエンドに送信
    const convertedReport = camelToSnake(report);
    
    return { data: convertedReport };
  } catch (error) {
    console.error("勘定科目使用状況レポート取得エラー:", error);
    return { error: "使用状況レポートの取得に失敗しました。" };
  }
}

/**
 * 勘定科目タイプ別サマリー取得Action
 */
export async function getAccountTypesSummaryUnifiedAction() {
  try {
    const accountService = dataAccess.services.account;
    const summary = await accountService.getAccountTypesSummary();
    
    // snake_caseに変換してフロントエンドに送信
    const convertedSummary = camelToSnake(summary);
    
    return { data: convertedSummary };
  } catch (error) {
    console.error("勘定科目タイプ別サマリー取得エラー:", error);
    return { error: "サマリーの取得に失敗しました。" };
  }
}

/**
 * 勘定科目CSVエクスポートAction
 */
export async function exportAccountsCSVUnifiedAction(options?: {
  accountType?: string;
  isActive?: boolean;
}) {
  try {
    const accountService = dataAccess.services.account;
    
    const searchOptions = {
      accountType: options?.accountType as Account['accountType'],
      isActive: options?.isActive
    };
    
    const csvContent = await accountService.exportAccountsToCSV(searchOptions);
    
    return { data: csvContent };
  } catch (error) {
    console.error("勘定科目CSVエクスポートエラー:", error);
    return { error: "CSVエクスポートに失敗しました。" };
  }
}

/**
 * レガシーアクションとの互換性を保つためのエイリアス
 * 段階的移行期間中に使用
 */
export const getAccountsWithPaginationAction = getAccountsWithPaginationUnifiedAction;
export const getAccountByCodeAction = getAccountByCodeUnifiedAction;
export const getAccountsHierarchyAction = getAccountsHierarchyUnifiedAction;
export const createAccountAction = createAccountUnifiedAction;
export const updateAccountAction = updateAccountUnifiedAction;
export const deleteAccountAction = deleteAccountUnifiedAction;