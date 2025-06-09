import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Account,
  AccountFilter,
  AccountInsert,
  AccountUpdate,
  AccountWithSubAccounts,
  AnalysisCode,
  AnalysisCodeInsert,
  AnalysisCodeUpdate,
  PaginatedResult,
  PaginationParams,
  Partner,
  PartnerFilter,
  PartnerInsert,
  PartnerUpdate,
  SubAccount,
  SubAccountInsert,
  SubAccountUpdate,
} from "./";
import { SupabaseQueryBuilder } from "./query-builder";

/**
 * 勘定科目マスタ操作
 */
export class AccountService {
  /**
   * 全勘定科目を取得
   */
  static async getAccounts(
    filter: AccountFilter = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResult<AccountWithSubAccounts>> {
    const { data, pagination: pag } = await SupabaseQueryBuilder.getAccounts(
      filter,
      pagination,
    );

    // サブ勘定科目をロードするロジックをここに追加可能
    const accountsWithSubAccounts = await Promise.all(
      data.map(async (account) => {
        const supabase = await createServerSupabaseClient();
        const { data: subAccounts, error } = await supabase
          .from("sub_accounts")
          .select("*")
          .eq("account_code", account.account_code);

        if (error) {
          console.error(`サブ勘定科目の取得に失敗しました: ${error.message}`);
          return { ...account, sub_accounts: [] };
        }
        return { ...account, sub_accounts: subAccounts || [] };
      }),
    );

    return { data: accountsWithSubAccounts, pagination: pag };
  }

  /**
   * 勘定科目IDで取得
   */
  static async getAccountByCode(
    accountCode: string,
  ): Promise<AccountWithSubAccounts | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("account_code", accountCode)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116は「見つからない」エラー
      throw new Error(`勘定科目の取得に失敗しました: ${error.message}`);
    }

    if (!data) return null;

    const { data: subAccounts, error: subError } = await supabase
      .from("sub_accounts")
      .select("*")
      .eq("account_code", accountCode);

    if (subError) {
      console.error(`サブ勘定科目の取得に失敗しました: ${subError.message}`);
      return { ...data, sub_accounts: [] };
    }

    return { ...data, sub_accounts: subAccounts || [] };
  }

  /**
   * 新しい勘定科目を作成
   */
  static async createAccount(account: AccountInsert): Promise<Account> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("accounts")
      .insert(account)
      .select()
      .single();

    if (error) {
      throw new Error(`勘定科目の作成に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 勘定科目を更新
   */
  static async updateAccount(
    accountCode: string,
    updates: AccountUpdate,
  ): Promise<Account> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("accounts")
      .update(updates)
      .eq("account_code", accountCode)
      .select()
      .single();

    if (error) {
      throw new Error(`勘定科目の更新に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 勘定科目を削除
   */
  static async deleteAccount(accountCode: string): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("account_code", accountCode);

    if (error) {
      throw new Error(`勘定科目の削除に失敗しました: ${error.message}`);
    }
  }
}

/**
 * 補助科目マスタ操作
 */
export class SubAccountService {
  /**
   * 全補助科目を取得
   */
  static async getSubAccounts(): Promise<SubAccount[]> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sub_accounts")
      .select("*");

    if (error) {
      throw new Error(`補助科目の取得に失敗しました: ${error.message}`);
    }
    return data || [];
  }

  /**
   * 補助科目IDで取得
   */
  static async getSubAccountByCode(
    subAccountCode: string,
  ): Promise<SubAccount | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sub_accounts")
      .select("*")
      .eq("sub_account_code", subAccountCode)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`補助科目の取得に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 新しい補助科目を作成
   */
  static async createSubAccount(
    subAccount: SubAccountInsert,
  ): Promise<SubAccount> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sub_accounts")
      .insert(subAccount)
      .select()
      .single();

    if (error) {
      throw new Error(`補助科目の作成に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 補助科目を更新
   */
  static async updateSubAccount(
    subAccountCode: string,
    updates: SubAccountUpdate,
  ): Promise<SubAccount> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sub_accounts")
      .update(updates)
      .eq("sub_account_code", subAccountCode)
      .select()
      .single();

    if (error) {
      throw new Error(`補助科目の更新に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 補助科目を削除
   */
  static async deleteSubAccount(subAccountCode: string): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("sub_accounts")
      .delete()
      .eq("sub_account_code", subAccountCode);

    if (error) {
      throw new Error(`補助科目の削除に失敗しました: ${error.message}`);
    }
  }
}

/**
 * 取引先マスタ操作
 */
export class PartnerService {
  /**
   * 全取引先を取得
   */
  static async getPartners(
    filter: PartnerFilter = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResult<Partner>> {
    return SupabaseQueryBuilder.getPartners(filter, pagination);
  }

  /**
   * 取引先IDで取得
   */
  static async getPartnerByCode(partnerCode: string): Promise<Partner | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_code", partnerCode)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`取引先の取得に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 新しい取引先を作成
   */
  static async createPartner(partner: PartnerInsert): Promise<Partner> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("partners")
      .insert(partner)
      .select()
      .single();

    if (error) {
      throw new Error(`取引先の作成に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 取引先を更新
   */
  static async updatePartner(
    partnerCode: string,
    updates: PartnerUpdate,
  ): Promise<Partner> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("partners")
      .update(updates)
      .eq("partner_code", partnerCode)
      .select()
      .single();

    if (error) {
      throw new Error(`取引先の更新に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 取引先を削除
   */
  static async deletePartner(partnerCode: string): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("partners")
      .delete()
      .eq("partner_code", partnerCode);

    if (error) {
      throw new Error(`取引先の削除に失敗しました: ${error.message}`);
    }
  }
}

/**
 * 分析コードマスタ操作
 */
export class AnalysisCodeService {
  /**
   * 全分析コードを取得
   */
  static async getAnalysisCodes(): Promise<AnalysisCode[]> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("analysis_codes")
      .select("*");

    if (error) {
      throw new Error(`分析コードの取得に失敗しました: ${error.message}`);
    }
    return data || [];
  }

  /**
   * 分析コードIDで取得
   */
  static async getAnalysisCodeByCode(
    analysisCode: string,
  ): Promise<AnalysisCode | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("analysis_codes")
      .select("*")
      .eq("analysis_code", analysisCode)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`分析コードの取得に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 新しい分析コードを作成
   */
  static async createAnalysisCode(
    analysisCode: AnalysisCodeInsert,
  ): Promise<AnalysisCode> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("analysis_codes")
      .insert(analysisCode)
      .select()
      .single();

    if (error) {
      throw new Error(`分析コードの作成に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 分析コードを更新
   */
  static async updateAnalysisCode(
    analysisCode: string,
    updates: AnalysisCodeUpdate,
  ): Promise<AnalysisCode> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("analysis_codes")
      .update(updates)
      .eq("analysis_code", analysisCode)
      .select()
      .single();

    if (error) {
      throw new Error(`分析コードの更新に失敗しました: ${error.message}`);
    }
    return data;
  }

  /**
   * 分析コードを削除
   */
  static async deleteAnalysisCode(analysisCode: string): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("analysis_codes")
      .delete()
      .eq("analysis_code", analysisCode);

    if (error) {
      throw new Error(`分析コードの削除に失敗しました: ${error.message}`);
    }
  }
}
