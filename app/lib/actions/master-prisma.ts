"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
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

// マスタデータ共通のZodスキーマ
// アカウント（勘定科目）スキーマ
const AccountSchema = z.object({
  accountCode: z.string().min(1, "勘定科目コードは必須です"),
  accountName: z.string().min(1, "勘定科目名は必須です"),
  accountType: z.enum(["資産", "負債", "資本", "収益", "費用"], {
    message: "有効な勘定科目タイプを選択してください",
  }),
  parentAccountCode: z.string().nullable().optional(),
  isDetail: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().nullable().optional(),
});

// 補助科目スキーマ
const SubAccountSchema = z.object({
  subAccountCode: z.string().min(1, "補助科目コードは必須です"),
  accountCode: z.string().min(1, "勘定科目コードは必須です"),
  subAccountName: z.string().min(1, "補助科目名は必須です"),
  isActive: z.boolean().optional(),
  sortOrder: z.number().nullable().optional(),
});

// 取引先スキーマ
const PartnerSchema = z.object({
  partnerCode: z.string().min(1, "取引先コードは必須です"),
  partnerName: z.string().min(1, "取引先名は必須です"),
  partnerKana: z.string().nullable().optional(),
  partnerType: z.enum(["得意先", "仕入先", "金融機関", "その他"], {
    message: "有効な取引先タイプを選択してください",
  }),
  postalCode: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// 分析コードスキーマ
const AnalysisCodeSchema = z.object({
  analysisCode: z.string().min(1, "分析コードは必須です"),
  analysisName: z.string().min(1, "分析コード名は必須です"),
  analysisType: z.string().min(1, "分析タイプは必須です"),
  parentAnalysisCode: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().nullable().optional(),
});

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
  const rawFormData = {
    accountCode: formData.get("accountCode") as string,
    accountName: formData.get("accountName") as string,
    accountType: formData.get("accountType") as string,
    parentAccountCode: formData.get("parentAccountCode") as string | null,
    isDetail: formData.get("isDetail") === "true",
    isActive: formData.get("isActive") !== "false", // デフォルトtrue
    sortOrder: formData.get("sortOrder")
      ? Number(formData.get("sortOrder"))
      : null,
  };

  // バリデーション
  const validatedFields = AccountSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const createData: Prisma.AccountCreateInput = {
      ...validatedFields.data,
      parentAccount: validatedFields.data.parentAccountCode
        ? { connect: { accountCode: validatedFields.data.parentAccountCode } }
        : undefined,
    };
    delete (createData as any).parentAccountCode; // Prismaリレーション用に削除

    const account = await AccountService.createAccount(createData);
    
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
  const rawFormData = {
    accountName: formData.get("accountName") as string,
    accountType: formData.get("accountType") as string,
    parentAccountCode: formData.get("parentAccountCode") as string | null,
    isDetail: formData.get("isDetail") === "true",
    isActive: formData.get("isActive") === "true",
    sortOrder: formData.get("sortOrder")
      ? Number(formData.get("sortOrder"))
      : null,
  };

  // バリデーション
  const validatedFields = AccountSchema.partial().safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const updateData: Prisma.AccountUpdateInput = {
      ...validatedFields.data,
      parentAccount: validatedFields.data.parentAccountCode
        ? { connect: { accountCode: validatedFields.data.parentAccountCode } }
        : { disconnect: true },
    };
    delete (updateData as any).parentAccountCode; // Prismaリレーション用に削除

    const account = await AccountService.updateAccount(accountCode, updateData);
    
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
  const rawFormData = {
    subAccountCode: formData.get("subAccountCode") as string,
    accountCode: formData.get("accountCode") as string,
    subAccountName: formData.get("subAccountName") as string,
    isActive: formData.get("isActive") !== "false", // デフォルトtrue
    sortOrder: formData.get("sortOrder")
      ? Number(formData.get("sortOrder"))
      : null,
  };

  // バリデーション
  const validatedFields = SubAccountSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const createData: Prisma.SubAccountCreateInput = {
      ...validatedFields.data,
      account: { connect: { accountCode: validatedFields.data.accountCode } },
    };
    delete (createData as any).accountCode; // Prismaリレーション用に削除

    const subAccount = await SubAccountService.createSubAccount(createData);
    
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
  const rawFormData = {
    subAccountName: formData.get("subAccountName") as string,
    isActive: formData.get("isActive") === "true",
    sortOrder: formData.get("sortOrder")
      ? Number(formData.get("sortOrder"))
      : null,
  };

  // バリデーション
  const validatedFields = SubAccountSchema.partial().safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const subAccount = await SubAccountService.updateSubAccount(
      accountCode,
      subAccountCode,
      validatedFields.data,
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
  const rawFormData = {
    partnerCode: formData.get("partnerCode") as string,
    partnerName: formData.get("partnerName") as string,
    partnerKana: formData.get("partnerKana") as string | null,
    partnerType: formData.get("partnerType") as string,
    postalCode: formData.get("postalCode") as string | null,
    address: formData.get("address") as string | null,
    phone: formData.get("phone") as string | null,
    email: formData.get("email") as string | null,
    contactPerson: formData.get("contactPerson") as string | null,
    isActive: formData.get("isActive") !== "false", // デフォルトtrue
  };

  // バリデーション
  const validatedFields = PartnerSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const partner = await PartnerService.createPartner(validatedFields.data);
    
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
  const rawFormData = {
    partnerName: formData.get("partnerName") as string,
    partnerKana: formData.get("partnerKana") as string | null,
    partnerType: formData.get("partnerType") as string,
    postalCode: formData.get("postalCode") as string | null,
    address: formData.get("address") as string | null,
    phone: formData.get("phone") as string | null,
    email: formData.get("email") as string | null,
    contactPerson: formData.get("contactPerson") as string | null,
    isActive: formData.get("isActive") === "true",
  };

  // バリデーション
  const validatedFields = PartnerSchema.partial().safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const partner = await PartnerService.updatePartner(partnerCode, validatedFields.data);
    
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
  const rawFormData = {
    analysisCode: formData.get("analysisCode") as string,
    analysisName: formData.get("analysisName") as string,
    analysisType: formData.get("analysisType") as string,
    parentAnalysisCode: formData.get("parentAnalysisCode") as string | null,
    isActive: formData.get("isActive") !== "false", // デフォルトtrue
    sortOrder: formData.get("sortOrder")
      ? Number(formData.get("sortOrder"))
      : null,
  };

  // バリデーション
  const validatedFields = AnalysisCodeSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const createData: Prisma.AnalysisCodeCreateInput = {
      ...validatedFields.data,
      parentAnalysisCode_rel: validatedFields.data.parentAnalysisCode
        ? { connect: { analysisCode: validatedFields.data.parentAnalysisCode } }
        : undefined,
    };
    delete (createData as any).parentAnalysisCode; // Prismaリレーション用に削除

    const analysisCode = await AnalysisCodeService.createAnalysisCode(createData);
    
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
  const rawFormData = {
    analysisName: formData.get("analysisName") as string,
    analysisType: formData.get("analysisType") as string,
    parentAnalysisCode: formData.get("parentAnalysisCode") as string | null,
    isActive: formData.get("isActive") === "true",
    sortOrder: formData.get("sortOrder")
      ? Number(formData.get("sortOrder"))
      : null,
  };

  // バリデーション
  const validatedFields = AnalysisCodeSchema.partial().safeParse(rawFormData);
  if (!validatedFields.success) {
    return createFormValidationError(validatedFields.error.flatten().fieldErrors);
  }

  try {
    const updateData: Prisma.AnalysisCodeUpdateInput = {
      ...validatedFields.data,
      parentAnalysisCode_rel: validatedFields.data.parentAnalysisCode
        ? { connect: { analysisCode: validatedFields.data.parentAnalysisCode } }
        : { disconnect: true },
    };
    delete (updateData as any).parentAnalysisCode; // Prismaリレーション用に削除

    const updatedAnalysisCode = await AnalysisCodeService.updateAnalysisCode(analysisCodeId, updateData);
    
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
