import type {
  Account,
  AnalysisCode,
  Partner,
  Prisma,
  SubAccount,
} from "@/lib/database/prisma";

// Server Actions import
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
  getAccountsWithPaginationAction,
  getAnalysisCodesAction,
  getPartnersAction,
  getSubAccountsAction,
  updateAccountAction,
  updateAnalysisCodeAction,
  updatePartnerAction,
  updateSubAccountAction,
} from "@/app/lib/actions/master-prisma";

// API Routes経由でPrismaサービスにアクセス
// クライアントサイドからは直接Prismaクライアントを使用せず、
// Server ActionsやAPI Routesを通じてアクセスする

/**
 * Prismaベースクライアント勘定科目サービス
 * Server Actionsを直接呼び出すため型安全性が確保される
 */
export class PrismaClientAccountService {
  /**
   * 全勘定科目を取得
   */
  static async getAccounts(): Promise<
    { success: true; data: Account[] } | { success: false; error: string }
  > {
    try {
      const result = await getAccountsWithPaginationAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "予期しないエラーが発生しました",
        };
      }

      return { success: true, data: result.data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "勘定科目の取得に失敗しました",
      };
    }
  }

  /**
   * 勘定科目を削除
   */
  static async deleteAccount(
    accountCode: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const result = await deleteAccountAction(accountCode);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "勘定科目の削除に失敗しました",
      };
    }
  }

  /**
   * 勘定科目を作成
   * FormDataを構築してServer Actionを呼び出す
   */
  static async createAccount(
    account: {
      accountCode: string;
      accountName: string;
      accountType: string;
      parentAccountCode?: string | null;
      isDetail?: boolean;
      isActive?: boolean;
      sortOrder?: number | null;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      formData.append("accountCode", account.accountCode);
      formData.append("accountName", account.accountName);
      formData.append("accountType", account.accountType);
      if (account.parentAccountCode) {
        formData.append("parentAccountCode", account.parentAccountCode);
      }
      formData.append("isDetail", String(account.isDetail ?? false));
      formData.append("isActive", String(account.isActive ?? true));
      if (account.sortOrder !== null && account.sortOrder !== undefined) {
        formData.append("sortOrder", String(account.sortOrder));
      }

      const result = await createAccountAction(formData);

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "勘定科目の作成に失敗しました",
      };
    }
  }

  /**
   * 勘定科目を更新
   */
  static async updateAccount(
    accountCode: string,
    updates: {
      accountName?: string;
      accountType?: string;
      parentAccountCode?: string | null;
      isDetail?: boolean;
      isActive?: boolean;
      sortOrder?: number | null;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      if (updates.accountName) {
        formData.append("accountName", updates.accountName);
      }
      if (updates.accountType) {
        formData.append("accountType", updates.accountType);
      }
      if (updates.parentAccountCode !== undefined) {
        formData.append("parentAccountCode", updates.parentAccountCode || "");
      }
      if (updates.isDetail !== undefined) {
        formData.append("isDetail", String(updates.isDetail));
      }
      if (updates.isActive !== undefined) {
        formData.append("isActive", String(updates.isActive));
      }
      if (updates.sortOrder !== null && updates.sortOrder !== undefined) {
        formData.append("sortOrder", String(updates.sortOrder));
      }

      const result = await updateAccountAction(accountCode, formData);

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "勘定科目の更新に失敗しました",
      };
    }
  }
}

/**
 * Prismaベースクライアント補助科目サービス
 */
export class PrismaClientSubAccountService {
  /**
   * 全補助科目を取得
   */
  static async getSubAccounts(): Promise<
    { success: true; data: any[] } | { success: false; error: string }
  > {
    try {
      const result = await getSubAccountsAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "予期しないエラーが発生しました",
        };
      }

      return { success: true, data: result.data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "補助科目の取得に失敗しました",
      };
    }
  }

  /**
   * 補助科目を削除
   */
  static async deleteSubAccount(
    accountCode: string,
    subAccountCode: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const result = await deleteSubAccountAction(accountCode, subAccountCode);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "補助科目の削除に失敗しました",
      };
    }
  }

  /**
   * 補助科目を作成
   */
  static async createSubAccount(
    subAccount: {
      subAccountCode: string;
      accountCode: string;
      subAccountName: string;
      isActive?: boolean;
      sortOrder?: number | null;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      formData.append("subAccountCode", subAccount.subAccountCode);
      formData.append("accountCode", subAccount.accountCode);
      formData.append("subAccountName", subAccount.subAccountName);
      formData.append("isActive", String(subAccount.isActive ?? true));
      if (subAccount.sortOrder !== null && subAccount.sortOrder !== undefined) {
        formData.append("sortOrder", String(subAccount.sortOrder));
      }

      const result = await createSubAccountAction(formData);

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "補助科目の作成に失敗しました",
      };
    }
  }

  /**
   * 補助科目を更新
   */
  static async updateSubAccount(
    accountCode: string,
    subAccountCode: string,
    updates: {
      subAccountName?: string;
      isActive?: boolean;
      sortOrder?: number | null;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      if (updates.subAccountName) {
        formData.append("subAccountName", updates.subAccountName);
      }
      if (updates.isActive !== undefined) {
        formData.append("isActive", String(updates.isActive));
      }
      if (updates.sortOrder !== null && updates.sortOrder !== undefined) {
        formData.append("sortOrder", String(updates.sortOrder));
      }

      const result = await updateSubAccountAction(
        accountCode,
        subAccountCode,
        formData,
      );

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "補助科目の更新に失敗しました",
      };
    }
  }
}

/**
 * Prismaベースクライアント取引先サービス
 */
export class PrismaClientPartnerService {
  /**
   * 全取引先を取得
   */
  static async getPartners(): Promise<
    { success: true; data: any[] } | { success: false; error: string }
  > {
    try {
      const result = await getPartnersAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "予期しないエラーが発生しました",
        };
      }

      return { success: true, data: result.data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "取引先の取得に失敗しました",
      };
    }
  }

  /**
   * 取引先を削除
   */
  static async deletePartner(
    partnerCode: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const result = await deletePartnerAction(partnerCode);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "取引先の削除に失敗しました",
      };
    }
  }

  /**
   * 取引先を作成
   */
  static async createPartner(
    partner: {
      partnerCode: string;
      partnerName: string;
      partnerKana?: string | null;
      partnerType: string;
      postalCode?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      contactPerson?: string | null;
      isActive?: boolean;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      formData.append("partnerCode", partner.partnerCode);
      formData.append("partnerName", partner.partnerName);
      if (partner.partnerKana) {
        formData.append("partnerKana", partner.partnerKana);
      }
      formData.append("partnerType", partner.partnerType);
      if (partner.postalCode) formData.append("postalCode", partner.postalCode);
      if (partner.address) formData.append("address", partner.address);
      if (partner.phone) formData.append("phone", partner.phone);
      if (partner.email) formData.append("email", partner.email);
      if (partner.contactPerson) {
        formData.append("contactPerson", partner.contactPerson);
      }
      formData.append("isActive", String(partner.isActive ?? true));

      const result = await createPartnerAction(formData);

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "取引先の作成に失敗しました",
      };
    }
  }

  /**
   * 取引先を更新
   */
  static async updatePartner(
    partnerCode: string,
    updates: {
      partnerName?: string;
      partnerKana?: string | null;
      partnerType?: string;
      postalCode?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      contactPerson?: string | null;
      isActive?: boolean;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      if (updates.partnerName) {
        formData.append("partnerName", updates.partnerName);
      }
      if (updates.partnerKana) {
        formData.append("partnerKana", updates.partnerKana);
      }
      if (updates.partnerType) {
        formData.append("partnerType", updates.partnerType);
      }
      if (updates.postalCode) formData.append("postalCode", updates.postalCode);
      if (updates.address) formData.append("address", updates.address);
      if (updates.phone) formData.append("phone", updates.phone);
      if (updates.email) formData.append("email", updates.email);
      if (updates.contactPerson) {
        formData.append("contactPerson", updates.contactPerson);
      }
      if (updates.isActive !== undefined) {
        formData.append("isActive", String(updates.isActive));
      }

      const result = await updatePartnerAction(partnerCode, formData);

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "取引先の更新に失敗しました",
      };
    }
  }
}

/**
 * Prismaベースクライアント分析コードサービス
 */
export class PrismaClientAnalysisCodeService {
  /**
   * 全分析コードを取得
   */
  static async getAnalysisCodes(): Promise<
    { success: true; data: any[] } | { success: false; error: string }
  > {
    try {
      const result = await getAnalysisCodesAction();

      if ("error" in result) {
        return {
          success: false,
          error: result.error || "予期しないエラーが発生しました",
        };
      }

      return { success: true, data: result.data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "分析コードの取得に失敗しました",
      };
    }
  }

  /**
   * 分析コードを削除
   */
  static async deleteAnalysisCode(
    analysisCode: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const result = await deleteAnalysisCodeAction(analysisCode);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "分析コードの削除に失敗しました",
      };
    }
  }

  /**
   * 分析コードを作成
   */
  static async createAnalysisCode(
    analysisCode: {
      analysisCode: string;
      analysisName: string;
      analysisType: string;
      parentAnalysisCode?: string | null;
      isActive?: boolean;
      sortOrder?: number | null;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      formData.append("analysisCode", analysisCode.analysisCode);
      formData.append("analysisName", analysisCode.analysisName);
      formData.append("analysisType", analysisCode.analysisType);
      if (analysisCode.parentAnalysisCode) {
        formData.append("parentAnalysisCode", analysisCode.parentAnalysisCode);
      }
      formData.append("isActive", String(analysisCode.isActive ?? true));
      if (
        analysisCode.sortOrder !== null && analysisCode.sortOrder !== undefined
      ) {
        formData.append("sortOrder", String(analysisCode.sortOrder));
      }

      const result = await createAnalysisCodeAction(formData);

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "分析コードの作成に失敗しました",
      };
    }
  }

  /**
   * 分析コードを更新
   */
  static async updateAnalysisCode(
    analysisCode: string,
    updates: {
      analysisName?: string;
      analysisType?: string;
      parentAnalysisCode?: string | null;
      isActive?: boolean;
      sortOrder?: number | null;
    },
  ): Promise<
    { success: true; data?: any } | { success: false; error: string }
  > {
    try {
      const formData = new FormData();
      if (updates.analysisName) {
        formData.append("analysisName", updates.analysisName);
      }
      if (updates.analysisType) {
        formData.append("analysisType", updates.analysisType);
      }
      if (updates.parentAnalysisCode) {
        formData.append("parentAnalysisCode", updates.parentAnalysisCode);
      }
      if (updates.isActive !== undefined) {
        formData.append("isActive", String(updates.isActive));
      }
      if (updates.sortOrder !== null && updates.sortOrder !== undefined) {
        formData.append("sortOrder", String(updates.sortOrder));
      }

      const result = await updateAnalysisCodeAction(analysisCode, formData);

      if (result && "message" in result) {
        return { success: false, error: result.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "分析コードの更新に失敗しました",
      };
    }
  }

  /**
   * 分析タイプ一覧を取得
   * 既存のServer Actionがないため、暫定的にstatic値を返す
   */
  static async getAnalysisTypes(): Promise<
    { success: true; data: string[] } | { success: false; error: string }
  > {
    try {
      // 暫定的に固定値を返す
      // 必要に応じて、Server Actionを追加するか、データベースから直接取得
      const types = ["部門", "プロジェクト", "製品", "地域", "顧客"];
      return { success: true, data: types };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "分析タイプの取得に失敗しました",
      };
    }
  }
}
