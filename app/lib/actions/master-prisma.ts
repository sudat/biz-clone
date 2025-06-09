"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AccountFilter,
  AccountService,
  AnalysisCodeService,
  PaginationParams,
  PartnerFilter,
  PartnerService,
  SubAccountService,
} from "@/lib/database/master-prisma";
import type {
  Account,
  AnalysisCode,
  Partner,
  Prisma,
  SubAccount,
} from "@/lib/database/prisma";
import { ActionResult } from "@/lib/types/errors";
import { 
  handleServerActionError as handleError,
  createFormValidationError 
} from "@/lib/utils/error-handler";

// 統一スキーマのインポート
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
 * 勘定科目 Server Actions
 */
export async function getAccountsWithPaginationAction(
  filter: AccountFilter = {},
  pagination: PaginationParams = {},
) {
  try {
    const result = await AccountService.getAccounts(filter, pagination);
    return { data: result.data, pagination: result.pagination };
  } catch (error) {
    console.error("勘定科目取得エラー:", error);
    return { error: "勘定科目の取得に失敗しました。" };
  }
}

export async function getAccountByCodeAction(accountCode: string) {
  try {
    const account = await AccountService.getAccountByCode(accountCode);
    return { data: account };
  } catch (error) {
    console.error("勘定科目詳細取得エラー:", error);
    return { error: "勘定科目詳細の取得に失敗しました。" };
  }
}

export async function getAccountsHierarchyAction() {
  try {
    const accounts = await AccountService.getAccountsHierarchy();
    return { data: accounts };
  } catch (error) {
    console.error("勘定科目階層取得エラー:", error);
    return { error: "勘定科目階層の取得に失敗しました。" };
  }
}

export async function createAccountAction(formData: FormData): Promise<ActionResult<Account>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = createAccountSchema.safeParse({
    account_code: rawFormData.accountCode,
    account_name: rawFormData.accountName,
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
    const createData: Prisma.AccountCreateInput = {
      account_code: data.account_code,
      account_name: data.account_name,
      account_type: data.account_type,
      is_detail: data.is_detail ?? true,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order,
      notes: data.notes,
      parentAccount: data.parent_account_code
        ? { connect: { account_code: data.parent_account_code } }
        : undefined,
    };

    await AccountService.createAccount(createData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/accounts");
    redirect("/master/accounts");
    
  } catch (error) {
    return handleError(error, "勘定科目の作成", "勘定科目");
  }
}

export async function updateAccountAction(
  accountCode: string,
  formData: FormData,
): Promise<ActionResult<Account>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = updateAccountSchema.safeParse({
    account_code: accountCode, // 更新時はコード必須
    account_name: rawFormData.accountName,
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
    const updateData: Prisma.AccountUpdateInput = {
      account_name: data.account_name,
      account_type: data.account_type,
      is_detail: data.is_detail,
      is_active: data.is_active,
      sort_order: data.sort_order,
      notes: data.notes,
      parentAccount: data.parent_account_code
        ? { connect: { account_code: data.parent_account_code } }
        : { disconnect: true },
    };

    await AccountService.updateAccount(accountCode, updateData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/accounts");
    redirect("/master/accounts");
    
  } catch (error) {
    return handleError(error, "勘定科目の更新", "勘定科目");
  }
}

export async function deleteAccountAction(
  accountCode: string,
): Promise<ActionResult<void>> {
  try {
    await AccountService.deleteAccount(accountCode);
    revalidatePath("/master/accounts");
    return { success: true };
  } catch (error) {
    return handleError(error, "勘定科目の削除", "勘定科目");
  }
}

/**
 * 補助科目 Server Actions
 */
export async function getSubAccountsAction() {
  try {
    const subAccounts = await SubAccountService.getSubAccounts();
    return { data: subAccounts };
  } catch (error) {
    console.error("補助科目取得エラー:", error);
    return { error: "補助科目の取得に失敗しました。" };
  }
}

export async function getSubAccountsByAccountCodeAction(accountCode: string) {
  try {
    const subAccounts = await SubAccountService.getSubAccountsByAccountCode(
      accountCode,
    );
    return { data: subAccounts };
  } catch (error) {
    console.error("補助科目取得エラー:", error);
    return { error: "補助科目の取得に失敗しました。" };
  }
}

export async function createSubAccountAction(formData: FormData): Promise<ActionResult<SubAccount>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = createSubAccountSchema.safeParse({
    sub_account_code: rawFormData.subAccountCode,
    account_code: rawFormData.accountCode,
    sub_account_name: rawFormData.subAccountName,
    sub_account_name_kana: rawFormData.subAccountNameKana || null,
    is_active: rawFormData.isActive ?? true,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const data = validatedFields.data;
    const createData: Prisma.SubAccountCreateInput = {
      sub_account_code: data.sub_account_code,
      sub_account_name: data.sub_account_name,
      sub_account_name_kana: data.sub_account_name_kana,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order,
      notes: data.notes,
      account: { connect: { account_code: data.account_code } },
    };

    await SubAccountService.createSubAccount(createData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/sub-accounts");
    redirect("/master/sub-accounts");
    
  } catch (error) {
    return handleError(error, "補助科目の作成", "補助科目");
  }
}

export async function updateSubAccountAction(
  accountCode: string,
  subAccountCode: string,
  formData: FormData,
): Promise<ActionResult<SubAccount>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = updateSubAccountSchema.safeParse({
    sub_account_code: subAccountCode, // 更新時はコード必須
    account_code: accountCode, // 関連する勘定科目コードも必須
    sub_account_name: rawFormData.subAccountName,
    sub_account_name_kana: rawFormData.subAccountNameKana || null,
    is_active: rawFormData.isActive,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const data = validatedFields.data;
    const updateData = {
      sub_account_name: data.sub_account_name,
      sub_account_name_kana: data.sub_account_name_kana,
      is_active: data.is_active,
      sort_order: data.sort_order,
      notes: data.notes
    };
    
    await SubAccountService.updateSubAccount(
      accountCode,
      subAccountCode,
      updateData,
    );
    
    // 成功時のリダイレクト
    revalidatePath("/master/sub-accounts");
    redirect("/master/sub-accounts");
    
  } catch (error) {
    return handleError(error, "補助科目の更新", "補助科目");
  }
}

export async function deleteSubAccountAction(
  accountCode: string,
  subAccountCode: string,
): Promise<ActionResult<void>> {
  try {
    await SubAccountService.deleteSubAccount(accountCode, subAccountCode);
    revalidatePath("/master/sub-accounts");
    return { success: true };
  } catch (error) {
    return handleError(error, "補助科目の削除", "補助科目");
  }
}

/**
 * 取引先 Server Actions
 */
export async function getPartnersAction(
  filter: PartnerFilter = {},
  pagination: PaginationParams = {},
) {
  try {
    const result = await PartnerService.getPartners(filter, pagination);
    return { data: result.data, pagination: result.pagination };
  } catch (error) {
    console.error("取引先取得エラー:", error);
    return { error: "取引先の取得に失敗しました。" };
  }
}

export async function getPartnerByCodeAction(partnerCode: string) {
  try {
    const partner = await PartnerService.getPartnerByCode(partnerCode);
    return { data: partner };
  } catch (error) {
    console.error("取引先詳細取得エラー:", error);
    return { error: "取引先詳細の取得に失敗しました。" };
  }
}

export async function createPartnerAction(formData: FormData): Promise<ActionResult<Partner>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = createPartnerSchema.safeParse({
    partner_code: rawFormData.partnerCode,
    partner_name: rawFormData.partnerName,
    partner_name_kana: rawFormData.partnerKana || null,
    partner_type: rawFormData.partnerType,
    postal_code: rawFormData.postalCode || null,
    address: rawFormData.address || null,
    phone: rawFormData.phone || null,
    email: rawFormData.email || null,
    contact_person: rawFormData.contactPerson || null,
    is_active: rawFormData.isActive ?? true,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    await PartnerService.createPartner(validatedFields.data);
    
    // 成功時のリダイレクト
    revalidatePath("/master/partners");
    redirect("/master/partners");
    
  } catch (error) {
    return handleError(error, "取引先の作成", "取引先");
  }
}

export async function updatePartnerAction(
  partnerCode: string,
  formData: FormData,
): Promise<ActionResult<Partner>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = updatePartnerSchema.safeParse({
    partner_code: partnerCode, // 更新時はコード必須
    partner_name: rawFormData.partnerName,
    partner_name_kana: rawFormData.partnerKana || null,
    partner_type: rawFormData.partnerType,
    postal_code: rawFormData.postalCode || null,
    address: rawFormData.address || null,
    phone: rawFormData.phone || null,
    email: rawFormData.email || null,
    contact_person: rawFormData.contactPerson || null,
    is_active: rawFormData.isActive,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const data = validatedFields.data;
    const updateData = {
      partner_name: data.partner_name,
      partner_name_kana: data.partner_name_kana,
      partner_type: data.partner_type,
      postal_code: data.postal_code,
      address: data.address,
      phone: data.phone,
      email: data.email,
      contact_person: data.contact_person,
      is_active: data.is_active,
      sort_order: data.sort_order,
      notes: data.notes
    };
    
    await PartnerService.updatePartner(partnerCode, updateData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/partners");
    redirect("/master/partners");
    
  } catch (error) {
    return handleError(error, "取引先の更新", "取引先");
  }
}

export async function deletePartnerAction(
  partnerCode: string,
): Promise<ActionResult<void>> {
  try {
    await PartnerService.deletePartner(partnerCode);
    revalidatePath("/master/partners");
    return { success: true };
  } catch (error) {
    return handleError(error, "取引先の削除", "取引先");
  }
}

/**
 * 分析コード Server Actions
 */
export async function getAnalysisCodesAction() {
  try {
    const analysisCodes = await AnalysisCodeService.getAnalysisCodes();
    return { data: analysisCodes };
  } catch (error) {
    console.error("分析コード取得エラー:", error);
    return { error: "分析コードの取得に失敗しました。" };
  }
}

export async function getAnalysisCodesHierarchyAction() {
  try {
    const analysisCodes = await AnalysisCodeService.getAnalysisCodesHierarchy();
    return { data: analysisCodes };
  } catch (error) {
    console.error("分析コード階層取得エラー:", error);
    return { error: "分析コード階層の取得に失敗しました。" };
  }
}

export async function createAnalysisCodeAction(formData: FormData): Promise<ActionResult<AnalysisCode>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = createAnalysisCodeSchema.safeParse({
    analysis_code: rawFormData.analysisCode,
    analysis_name: rawFormData.analysisName,
    analysis_name_kana: rawFormData.analysisNameKana || null,
    analysis_type: rawFormData.analysisType,
    parent_analysis_code: rawFormData.parentAnalysisCode || null,
    is_leaf: rawFormData.isLeaf ?? true,
    is_active: rawFormData.isActive ?? true,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const data = validatedFields.data;
    const createData: Prisma.AnalysisCodeCreateInput = {
      analysis_code: data.analysis_code,
      analysis_name: data.analysis_name,
      analysis_name_kana: data.analysis_name_kana,
      analysis_type: data.analysis_type,
      is_leaf: data.is_leaf ?? true,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order,
      notes: data.notes,
      parentAnalysisCode_rel: data.parent_analysis_code
        ? { connect: { analysis_code: data.parent_analysis_code } }
        : undefined,
    };

    await AnalysisCodeService.createAnalysisCode(createData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/analysis-codes");
    redirect("/master/analysis-codes");
    
  } catch (error) {
    return handleError(error, "分析コードの作成", "分析コード");
  }
}

export async function updateAnalysisCodeAction(
  analysisCodeId: string,
  formData: FormData,
): Promise<ActionResult<AnalysisCode>> {
  const rawFormData = extractFormData(formData);

  // 新しい統一スキーマでバリデーション
  const validatedFields = updateAnalysisCodeSchema.safeParse({
    analysis_code: analysisCodeId, // 更新時はコード必須
    analysis_name: rawFormData.analysisName,
    analysis_name_kana: rawFormData.analysisNameKana || null,
    analysis_type: rawFormData.analysisType,
    parent_analysis_code: rawFormData.parentAnalysisCode || null,
    is_leaf: rawFormData.isLeaf,
    is_active: rawFormData.isActive,
    sort_order: rawFormData.sortOrder || null,
    notes: rawFormData.notes || null
  });
  
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  // バリデーション
  const validatedFields = AnalysisCodeSchema.partial().safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const data = validatedFields.data;
    const updateData: Prisma.AnalysisCodeUpdateInput = {
      analysis_name: data.analysis_name,
      analysis_name_kana: data.analysis_name_kana,
      analysis_type: data.analysis_type,
      is_leaf: data.is_leaf,
      is_active: data.is_active,
      sort_order: data.sort_order,
      notes: data.notes,
      parentAnalysisCode_rel: data.parent_analysis_code
        ? { connect: { analysis_code: data.parent_analysis_code } }
        : { disconnect: true },
    };

    await AnalysisCodeService.updateAnalysisCode(analysisCodeId, updateData);
    
    // 成功時のリダイレクト
    revalidatePath("/master/analysis-codes");
    redirect("/master/analysis-codes");
    
  } catch (error) {
    return handleError(error, "分析コードの更新", "分析コード");
  }
}

export async function deleteAnalysisCodeAction(
  analysisCodeId: string,
): Promise<ActionResult<void>> {
  try {
    await AnalysisCodeService.deleteAnalysisCode(analysisCodeId);
    revalidatePath("/master/analysis-codes");
    return { success: true };
  } catch (error) {
    return handleError(error, "分析コードの削除", "分析コード");
  }
}
