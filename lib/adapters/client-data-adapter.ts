/**
 * Client-Side Data Service Adapter
 * ============================================================================
 * 既存のUIコンポーネント（snake_case期待）と新しいPrisma Server Actions（camelCase返却）
 * の間の橋渡しを行うアダプター層
 *
 * 役割:
 * 1. Prisma Server Actionsを呼び出し
 * 2. 返却されたcamelCaseデータをsnake_case形式に変換
 * 3. 既存UIコンポーネントが期待する形式でデータを提供
 * ============================================================================
 */

import { camelToSnake, snakeToCamel } from "@/lib/utils/typeConverters";
import { Database } from "@/lib/database/types";
import { ServiceResult } from "@/lib/types/errors";
import { handleAdapterError } from "@/lib/utils/error-handler";

// Server Actions imports
import {
  createAccountAction,
  createAnalysisCodeAction,
  createPartnerAction,
  createSubAccountAction,
  deleteAccountAction,
  deleteAnalysisCodeAction,
  deletePartnerAction,
  deleteSubAccountAction,
  getAccountByCodeAction,
  getAccountsHierarchyAction,
  getAccountsWithPaginationAction,
  getAnalysisCodesAction,
  getAnalysisCodesHierarchyAction,
  getPartnerByCodeAction,
  getPartnersAction,
  getSubAccountsAction,
  getSubAccountsByAccountCodeAction,
  updateAccountAction,
  updateAnalysisCodeAction,
  updatePartnerAction,
  updateSubAccountAction,
} from "@/app/lib/actions/master-prisma";

// Supabase型（UIが期待する形式）
type SupabaseAccount = Database["public"]["Tables"]["accounts"]["Row"];
type SupabaseSubAccount = Database["public"]["Tables"]["sub_accounts"]["Row"];
type SupabasePartner = Database["public"]["Tables"]["partners"]["Row"];
type SupabaseAnalysisCode =
  Database["public"]["Tables"]["analysis_codes"]["Row"];

// ServiceResponse型をServiceResultに統一
type ServiceResponse<T> = ServiceResult<T>;

// ====================
// 最適化されたFormData変換ヘルパー
// ====================

// FormData変換キャッシュ
const formDataCache = new Map<string, FormData>();

/**
 * オブジェクトをFormDataに変換するヘルパー関数（最適化版）
 */
function objectToFormData(obj: Record<string, unknown>): FormData {
  // キャッシュキー生成
  const cacheKey = JSON.stringify(obj);
  
  // キャッシュから確認
  if (formDataCache.has(cacheKey)) {
    const cached = formDataCache.get(cacheKey)!;
    // FormDataはクローンが必要
    return cloneFormData(cached);
  }
  
  const formData = new FormData();
  
  // camelCaseをsnake_caseに変換してFormDataに追加
  const convertedData = camelToSnake(obj, CONVERSION_OPTIONS);
  
  for (const [key, value] of Object.entries(convertedData)) {
    if (value !== null && value !== undefined) {
      if (typeof value === "boolean") {
        formData.append(key, value.toString());
      } else if (typeof value === "number") {
        formData.append(key, value.toString());
      } else {
        formData.append(key, String(value));
      }
    }
  }
  
  // キャッシュに保存（最大100エントリ）
  if (formDataCache.size < 100) {
    formDataCache.set(cacheKey, cloneFormData(formData));
  }
  
  return formData;
}

// FormDataクローンヘルパー
function cloneFormData(original: FormData): FormData {
  const cloned = new FormData();
  for (const [key, value] of original.entries()) {
    cloned.append(key, value);
  }
  return cloned;
}

// キャッシュクリア関数
export function clearFormDataCache(): void {
  formDataCache.clear();
}

/**
 * 勘定科目アダプター
 */
export class AccountDataAdapter {
  /**
   * 全勘定科目を取得（snake_case形式でUIに提供）
   */
  static async getAccounts(): Promise<ServiceResponse<SupabaseAccount[]>> {
    try {
      const result = await getAccountsWithPaginationAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "勘定科目の取得に失敗しました",
        };
      }

      // 最適化されたバッチ変換
      const convertedData = result.data 
        ? batchCamelToSnake<SupabaseAccount>(result.data, CONVERSION_OPTIONS)
        : [];

      return { success: true, data: convertedData };
    } catch (error) {
      return handleAdapterError(error, "勘定科目の取得");
    }
  }

  /**
   * 勘定科目を削除
   */
  static async deleteAccount(
    accountCode: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const result = await deleteAccountAction(accountCode);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "勘定科目の削除に失敗しました",
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return handleAdapterError(error, "勘定科目の削除");
    }
  }

  /**
   * 勘定科目を作成
   */
  static async createAccount(
    account: any,
  ): Promise<ServiceResponse<SupabaseAccount>> {
    try {
      // 最適化された変換処理
      const camelCaseAccount = snakeToCamel(account, CONVERSION_OPTIONS) as Record<string, unknown>;
      const formData = objectToFormData(camelCaseAccount);

      const result = await createAccountAction(formData);

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "勘定科目の作成に失敗しました",
        };
      }

      // 最適化された変換処理
      const convertedData: SupabaseAccount = camelToSnake<SupabaseAccount>(
        account,
        CONVERSION_OPTIONS
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabaseAccount = camelToSnake<SupabaseAccount>(
        account,
        CONVERSION_OPTIONS
      );
      return handleAdapterError(error, "勘定科目の作成", convertedData);
    }
  }

  /**
   * 勘定科目を更新
   */
  static async updateAccount(
    accountCode: string,
    updates: any,
  ): Promise<ServiceResponse<SupabaseAccount>> {
    try {
      // snake_case → camelCase 変換してFormDataに変換
      const camelCaseUpdates = snakeToCamel(updates) as Record<string, any>;
      const formData = objectToFormData(camelCaseUpdates);

      const result = await updateAccountAction(accountCode, formData);

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "勘定科目の更新に失敗しました",
        };
      }

      // 成功の場合はリダイレクトされるため、この時点では更新されたデータを返せない
      // 暫定的に更新されたデータを変換して返す
      const convertedData: SupabaseAccount = camelToSnake<SupabaseAccount>(
        { ...updates, account_code: accountCode },
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabaseAccount = camelToSnake<SupabaseAccount>(
        { ...updates, account_code: accountCode },
      );
      return handleAdapterError(error, "勘定科目の更新", convertedData);
    }
  }

  /**
   * 勘定科目検索（簡易版）
   * 現在はgetAccounts()の結果をフィルタリングして検索を模擬
   */
  static async searchAccounts(
    query: string,
    filters?: {
      account_type?: string;
      is_active?: boolean;
    },
  ): Promise<ServiceResponse<SupabaseAccount[]>> {
    try {
      const accountsResult = await this.getAccounts();

      if (!accountsResult.success) {
        return accountsResult;
      }

      let filteredData = accountsResult.data;

      // クエリによる検索
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        filteredData = filteredData.filter((account) =>
          account.account_code?.toLowerCase().includes(lowerQuery) ||
          account.account_name?.toLowerCase().includes(lowerQuery)
        );
      }

      // フィルターの適用
      if (filters?.account_type) {
        filteredData = filteredData.filter((account) =>
          account.account_type === filters.account_type
        );
      }

      if (filters?.is_active !== undefined) {
        filteredData = filteredData.filter((account) =>
          account.is_active === filters.is_active
        );
      }

      return {
        success: true,
        data: filteredData,
      };
    } catch (error) {
      return handleAdapterError(error, "勘定科目の検索");
    }
  }
}

/**
 * 補助科目アダプター
 */
export class SubAccountDataAdapter {
  /**
   * 全補助科目を取得（snake_case形式でUIに提供）
   */
  static async getSubAccounts(): Promise<
    ServiceResponse<SupabaseSubAccount[]>
  > {
    try {
      const result = await getSubAccountsAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "補助科目の取得に失敗しました",
        };
      }

      // Prisma camelCase → Supabase snake_case 変換
      const convertedData: SupabaseSubAccount[] =
        result.data?.map((subAccount: any) =>
          camelToSnake<SupabaseSubAccount>(subAccount)
        ) || [];

      return { success: true, data: convertedData };
    } catch (error) {
      return handleAdapterError(error, "補助科目の取得");
    }
  }

  /**
   * 特定の勘定科目の補助科目を取得
   */
  static async getSubAccountsByAccountCode(
    accountCode: string,
  ): Promise<ServiceResponse<SupabaseSubAccount[]>> {
    try {
      const result = await getSubAccountsByAccountCodeAction(accountCode);

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "補助科目の取得に失敗しました",
        };
      }

      // Prisma camelCase → Supabase snake_case 変換
      const convertedData: SupabaseSubAccount[] =
        result.data?.map((subAccount: any) =>
          camelToSnake<SupabaseSubAccount>(subAccount)
        ) || [];

      return { success: true, data: convertedData };
    } catch (error) {
      return handleAdapterError(error, "補助科目の取得");
    }
  }

  /**
   * 補助科目を削除
   */
  static async deleteSubAccount(
    accountCode: string,
    subAccountCode: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const result = await deleteSubAccountAction(accountCode, subAccountCode);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "補助科目の削除に失敗しました",
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return handleAdapterError(error, "補助科目の削除");
    }
  }

  /**
   * 補助科目を作成
   */
  static async createSubAccount(
    subAccount: any,
  ): Promise<ServiceResponse<SupabaseSubAccount>> {
    try {
      // snake_case → camelCase 変換してFormDataに変換
      const camelCaseSubAccount = snakeToCamel(subAccount) as Record<
        string,
        any
      >;
      const formData = objectToFormData(camelCaseSubAccount);

      const result = await createSubAccountAction(formData);

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "補助科目の作成に失敗しました",
        };
      }

      // 成功の場合はリダイレクトされるため、この時点では作成されたデータを返せない
      // 暫定的に元のデータを変換して返す
      const convertedData: SupabaseSubAccount = camelToSnake<
        SupabaseSubAccount
      >(
        subAccount,
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabaseSubAccount = camelToSnake<
        SupabaseSubAccount
      >(
        subAccount,
      );
      return handleAdapterError(error, "補助科目の作成", convertedData);
    }
  }

  /**
   * 補助科目を更新
   */
  static async updateSubAccount(
    accountCode: string,
    subAccountCode: string,
    updates: any,
  ): Promise<ServiceResponse<SupabaseSubAccount>> {
    try {
      // snake_case → camelCase 変換してFormDataに変換
      const camelCaseUpdates = snakeToCamel(updates) as Record<string, any>;
      const formData = objectToFormData(camelCaseUpdates);

      const result = await updateSubAccountAction(
        accountCode,
        subAccountCode,
        formData,
      );

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "補助科目の更新に失敗しました",
        };
      }

      // 成功の場合はリダイレクトされるため、この時点では更新されたデータを返せない
      // 暫定的に更新されたデータを変換して返す
      const convertedData: SupabaseSubAccount = camelToSnake<
        SupabaseSubAccount
      >(
        {
          ...updates,
          account_code: accountCode,
          sub_account_code: subAccountCode,
        },
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabaseSubAccount = camelToSnake<
        SupabaseSubAccount
      >(
        {
          ...updates,
          account_code: accountCode,
          sub_account_code: subAccountCode,
        },
      );
      return handleAdapterError(error, "補助科目の更新", convertedData);
    }
  }
}

/**
 * 取引先アダプター
 */
export class PartnerDataAdapter {
  /**
   * 全取引先を取得（snake_case形式でUIに提供）
   */
  static async getPartners(): Promise<ServiceResponse<SupabasePartner[]>> {
    try {
      const result = await getPartnersAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "取引先の取得に失敗しました",
        };
      }

      // Prisma camelCase → Supabase snake_case 変換
      const convertedData: SupabasePartner[] =
        result.data?.map((partner: any) =>
          camelToSnake<SupabasePartner>(partner)
        ) || [];

      return { success: true, data: convertedData };
    } catch (error) {
      return handleAdapterError(error, "取引先の取得");
    }
  }

  /**
   * 特定の取引先を取得
   */
  static async getPartnerByCode(
    partnerCode: string,
  ): Promise<ServiceResponse<SupabasePartner>> {
    try {
      const result = await getPartnerByCodeAction(partnerCode);

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "取引先の取得に失敗しました",
        };
      }

      if (!result.data) {
        return {
          success: false,
          error: "取引先が見つかりませんでした",
        };
      }

      // Prisma camelCase → Supabase snake_case 変換
      const convertedData: SupabasePartner = camelToSnake<SupabasePartner>(
        result.data,
      );

      return { success: true, data: convertedData };
    } catch (error) {
      return handleAdapterError(error, "取引先の取得");
    }
  }

  /**
   * 取引先を削除
   */
  static async deletePartner(
    partnerCode: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const result = await deletePartnerAction(partnerCode);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "取引先の削除に失敗しました",
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return handleAdapterError(error, "取引先の削除");
    }
  }

  /**
   * 取引先を作成
   */
  static async createPartner(
    partner: any,
  ): Promise<ServiceResponse<SupabasePartner>> {
    try {
      // snake_case → camelCase 変換してFormDataに変換
      const camelCasePartner = snakeToCamel(partner) as Record<string, any>;
      const formData = objectToFormData(camelCasePartner);

      const result = await createPartnerAction(formData);

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "取引先の作成に失敗しました",
        };
      }

      // 成功の場合はリダイレクトされるため、この時点では作成されたデータを返せない
      // 暫定的に元のデータを変換して返す
      const convertedData: SupabasePartner = camelToSnake<SupabasePartner>(
        partner,
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabasePartner = camelToSnake<SupabasePartner>(
        partner,
      );
      return handleAdapterError(error, "取引先の作成", convertedData);
    }
  }

  /**
   * 取引先を更新
   */
  static async updatePartner(
    partnerCode: string,
    updates: any,
  ): Promise<ServiceResponse<SupabasePartner>> {
    try {
      // snake_case → camelCase 変換してFormDataに変換
      const camelCaseUpdates = snakeToCamel(updates) as Record<string, any>;
      const formData = objectToFormData(camelCaseUpdates);

      const result = await updatePartnerAction(partnerCode, formData);

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "取引先の更新に失敗しました",
        };
      }

      // 成功の場合はリダイレクトされるため、この時点では更新されたデータを返せない
      // 暫定的に更新されたデータを変換して返す
      const convertedData: SupabasePartner = camelToSnake<SupabasePartner>(
        { ...updates, partner_code: partnerCode },
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabasePartner = camelToSnake<SupabasePartner>(
        { ...updates, partner_code: partnerCode },
      );
      return handleAdapterError(error, "取引先の更新", convertedData);
    }
  }

  /**
   * 取引先検索（簡易版）
   */
  static async searchPartners(
    query: string,
    filters?: {
      partner_type?: string;
      is_active?: boolean;
    },
  ): Promise<ServiceResponse<SupabasePartner[]>> {
    try {
      const partnersResult = await this.getPartners();

      if (!partnersResult.success) {
        return partnersResult;
      }

      let filteredData = partnersResult.data;

      // クエリによる検索
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        filteredData = filteredData.filter((partner) =>
          partner.partner_code?.toLowerCase().includes(lowerQuery) ||
          partner.partner_name?.toLowerCase().includes(lowerQuery) ||
          partner.partner_kana?.toLowerCase().includes(lowerQuery)
        );
      }

      // フィルターの適用
      if (filters?.partner_type) {
        filteredData = filteredData.filter((partner) =>
          partner.partner_type === filters.partner_type
        );
      }

      if (filters?.is_active !== undefined) {
        filteredData = filteredData.filter((partner) =>
          partner.is_active === filters.is_active
        );
      }

      return {
        success: true,
        data: filteredData,
      };
    } catch (error) {
      return handleAdapterError(error, "取引先の検索");
    }
  }
}

/**
 * 分析コードアダプター
 */
export class AnalysisCodeDataAdapter {
  /**
   * 全分析コードを取得（snake_case形式でUIに提供）
   */
  static async getAnalysisCodes(): Promise<
    ServiceResponse<SupabaseAnalysisCode[]>
  > {
    try {
      const result = await getAnalysisCodesAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "分析コードの取得に失敗しました",
        };
      }

      // Prisma camelCase → Supabase snake_case 変換
      const convertedData: SupabaseAnalysisCode[] =
        result.data?.map((analysisCode: any) =>
          camelToSnake<SupabaseAnalysisCode>(analysisCode)
        ) || [];

      return { success: true, data: convertedData };
    } catch (error) {
      return handleAdapterError(error, "分析コードの取得");
    }
  }

  /**
   * 分析コード階層を取得
   */
  static async getAnalysisCodesHierarchy(): Promise<
    ServiceResponse<SupabaseAnalysisCode[]>
  > {
    try {
      const result = await getAnalysisCodesHierarchyAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "分析コード階層の取得に失敗しました",
        };
      }

      // Prisma camelCase → Supabase snake_case 変換
      const convertedData: SupabaseAnalysisCode[] =
        result.data?.map((analysisCode: any) =>
          camelToSnake<SupabaseAnalysisCode>(analysisCode)
        ) || [];

      return { success: true, data: convertedData };
    } catch (error) {
      return handleAdapterError(error, "分析コード階層の取得");
    }
  }

  /**
   * 分析コードを削除
   */
  static async deleteAnalysisCode(
    analysisCode: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const result = await deleteAnalysisCodeAction(analysisCode);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "分析コードの削除に失敗しました",
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return handleAdapterError(error, "分析コードの削除");
    }
  }

  /**
   * 分析コードを作成
   */
  static async createAnalysisCode(
    analysisCode: any,
  ): Promise<ServiceResponse<SupabaseAnalysisCode>> {
    try {
      // snake_case → camelCase 変換してFormDataに変換
      const camelCaseAnalysisCode = snakeToCamel(analysisCode) as Record<
        string,
        any
      >;
      const formData = objectToFormData(camelCaseAnalysisCode);

      const result = await createAnalysisCodeAction(formData);

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "分析コードの作成に失敗しました",
        };
      }

      // 成功の場合はリダイレクトされるため、この時点では作成されたデータを返せない
      // 暫定的に元のデータを変換して返す
      const convertedData: SupabaseAnalysisCode = camelToSnake<
        SupabaseAnalysisCode
      >(
        analysisCode,
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabaseAnalysisCode = camelToSnake<
        SupabaseAnalysisCode
      >(
        analysisCode,
      );
      return handleAdapterError(error, "分析コードの作成", convertedData);
    }
  }

  /**
   * 分析コードを更新
   */
  static async updateAnalysisCode(
    analysisCode: string,
    updates: any,
  ): Promise<ServiceResponse<SupabaseAnalysisCode>> {
    try {
      // snake_case → camelCase 変換してFormDataに変換
      const camelCaseUpdates = snakeToCamel(updates) as Record<string, any>;
      const formData = objectToFormData(camelCaseUpdates);

      const result = await updateAnalysisCodeAction(analysisCode, formData);

      // Server Actionはリダイレクトするか、エラーを返す
      if ("message" in result) {
        return {
          success: false,
          error: result.message || "分析コードの更新に失敗しました",
        };
      }

      // 成功の場合はリダイレクトされるため、この時点では更新されたデータを返せない
      // 暫定的に更新されたデータを変換して返す
      const convertedData: SupabaseAnalysisCode = camelToSnake<
        SupabaseAnalysisCode
      >(
        { ...updates, analysis_code: analysisCode },
      );

      return { success: true, data: convertedData };
    } catch (error) {
      const convertedData: SupabaseAnalysisCode = camelToSnake<
        SupabaseAnalysisCode
      >(
        { ...updates, analysis_code: analysisCode },
      );
      return handleAdapterError(error, "分析コードの更新", convertedData);
    }
  }

  /**
   * 分析コード種別を取得
   */
  static async getAnalysisTypes(): Promise<ServiceResponse<string[]>> {
    try {
      // 暫定的に固定値を返す
      const types = ["部門", "プロジェクト", "製品", "地域", "顧客"];
      return { success: true, data: types };
    } catch (error) {
      return handleAdapterError(error, "分析タイプの取得");
    }
  }

  /**
   * 分析コード検索（簡易版）
   */
  static async searchAnalysisCodes(
    query: string,
    filters?: {
      analysis_type?: string;
      is_active?: boolean;
    },
  ): Promise<ServiceResponse<SupabaseAnalysisCode[]>> {
    try {
      const analysisCodesResult = await this.getAnalysisCodes();

      if (!analysisCodesResult.success) {
        return analysisCodesResult;
      }

      let filteredData = analysisCodesResult.data;

      // クエリによる検索
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        filteredData = filteredData.filter((analysisCode) =>
          analysisCode.analysis_code?.toLowerCase().includes(lowerQuery) ||
          analysisCode.analysis_name?.toLowerCase().includes(lowerQuery) ||
          analysisCode.analysis_type?.toLowerCase().includes(lowerQuery)
        );
      }

      // フィルターの適用
      if (filters?.analysis_type) {
        filteredData = filteredData.filter((analysisCode) =>
          analysisCode.analysis_type === filters.analysis_type
        );
      }

      if (filters?.is_active !== undefined) {
        filteredData = filteredData.filter((analysisCode) =>
          analysisCode.is_active === filters.is_active
        );
      }

      return {
        success: true,
        data: filteredData,
      };
    } catch (error) {
      return handleAdapterError(error, "分析コードの検索");
    }
  }
}

/**
 * 統合アダプターエクスポート（後方互換性のため）
 */
export const ClientAccountService = AccountDataAdapter;
export const ClientSubAccountService = SubAccountDataAdapter;
export const ClientPartnerService = PartnerDataAdapter;
export const ClientAnalysisCodeService = AnalysisCodeDataAdapter;
