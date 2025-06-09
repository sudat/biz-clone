import { prisma } from "./prisma";
import type {
  Account,
  AnalysisCode,
  Partner,
  Prisma,
  SubAccount,
} from "./prisma";

// ヘルパー型定義
export type AccountWithSubAccounts = Account & {
  subAccounts: SubAccount[];
};

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AccountFilter {
  accountType?: string;
  isActive?: boolean;
  search?: string;
}

export interface PartnerFilter {
  partnerType?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * 勘定科目マスタ操作（Prisma版）
 */
export class AccountService {
  /**
   * 全勘定科目を取得
   */
  static async getAccounts(
    filter: AccountFilter = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResult<AccountWithSubAccounts>> {
    const { page = 1, limit = 50, sortBy = "accountCode", sortOrder = "asc" } =
      pagination;
    const { accountType, isActive, search } = filter;

    // Where条件の構築
    const where: Prisma.AccountWhereInput = {};

    if (accountType) {
      where.accountType = accountType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { accountCode: { contains: search, mode: "insensitive" } },
        { accountName: { contains: search, mode: "insensitive" } },
      ];
    }

    // ソート条件の構築
    const orderBy: Prisma.AccountOrderByWithRelationInput = {};
    orderBy[sortBy as keyof Account] = sortOrder;

    // データ取得
    const [accounts, totalItems] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          subAccounts: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.account.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: accounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 勘定科目コードで取得
   */
  static async getAccountByCode(
    accountCode: string,
  ): Promise<AccountWithSubAccounts | null> {
    return await prisma.account.findUnique({
      where: { accountCode },
      include: {
        subAccounts: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  /**
   * 新しい勘定科目を作成
   */
  static async createAccount(
    account: Prisma.AccountCreateInput,
  ): Promise<Account> {
    return await prisma.account.create({
      data: account,
    });
  }

  /**
   * 勘定科目を更新
   */
  static async updateAccount(
    accountCode: string,
    updates: Prisma.AccountUpdateInput,
  ): Promise<Account> {
    return await prisma.account.update({
      where: { accountCode },
      data: updates,
    });
  }

  /**
   * 勘定科目を削除
   */
  static async deleteAccount(accountCode: string): Promise<void> {
    await prisma.account.delete({
      where: { accountCode },
    });
  }

  /**
   * 階層構造で勘定科目を取得
   */
  static async getAccountsHierarchy(): Promise<AccountWithSubAccounts[]> {
    return await prisma.account.findMany({
      where: { isActive: true },
      include: {
        subAccounts: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [
        { accountType: "asc" },
        { sortOrder: "asc" },
        { accountCode: "asc" },
      ],
    });
  }
}

/**
 * 補助科目マスタ操作（Prisma版）
 */
export class SubAccountService {
  /**
   * 全補助科目を取得
   */
  static async getSubAccounts(): Promise<SubAccount[]> {
    return await prisma.subAccount.findMany({
      orderBy: [
        { accountCode: "asc" },
        { sortOrder: "asc" },
        { subAccountCode: "asc" },
      ],
    });
  }

  /**
   * 勘定科目コード別に補助科目を取得
   */
  static async getSubAccountsByAccountCode(
    accountCode: string,
  ): Promise<SubAccount[]> {
    return await prisma.subAccount.findMany({
      where: {
        accountCode,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  /**
   * 補助科目コードで取得
   */
  static async getSubAccountByCode(
    accountCode: string,
    subAccountCode: string,
  ): Promise<SubAccount | null> {
    return await prisma.subAccount.findFirst({
      where: {
        accountCode,
        subAccountCode,
      },
    });
  }

  /**
   * 新しい補助科目を作成
   */
  static async createSubAccount(
    subAccount: Prisma.SubAccountCreateInput,
  ): Promise<SubAccount> {
    return await prisma.subAccount.create({
      data: subAccount,
    });
  }

  /**
   * 補助科目を更新
   */
  static async updateSubAccount(
    accountCode: string,
    subAccountCode: string,
    updates: Prisma.SubAccountUpdateInput,
  ): Promise<SubAccount> {
    return await prisma.subAccount.update({
      where: {
        accountCode_subAccountCode: {
          accountCode,
          subAccountCode,
        },
      },
      data: updates,
    });
  }

  /**
   * 補助科目を削除
   */
  static async deleteSubAccount(
    accountCode: string,
    subAccountCode: string,
  ): Promise<void> {
    await prisma.subAccount.delete({
      where: {
        accountCode_subAccountCode: {
          accountCode,
          subAccountCode,
        },
      },
    });
  }
}

/**
 * 取引先マスタ操作（Prisma版）
 */
export class PartnerService {
  /**
   * 全取引先を取得
   */
  static async getPartners(
    filter: PartnerFilter = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResult<Partner>> {
    const { page = 1, limit = 50, sortBy = "partnerCode", sortOrder = "asc" } =
      pagination;
    const { partnerType, isActive, search } = filter;

    // Where条件の構築
    const where: Prisma.PartnerWhereInput = {};

    if (partnerType) {
      where.partnerType = partnerType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { partnerCode: { contains: search, mode: "insensitive" } },
        { partnerName: { contains: search, mode: "insensitive" } },
        { partnerKana: { contains: search, mode: "insensitive" } },
      ];
    }

    // ソート条件の構築
    const orderBy: Prisma.PartnerOrderByWithRelationInput = {};
    orderBy[sortBy as keyof Partner] = sortOrder;

    // データ取得
    const [partners, totalItems] = await Promise.all([
      prisma.partner.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partner.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: partners,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 取引先コードで取得
   */
  static async getPartnerByCode(partnerCode: string): Promise<Partner | null> {
    return await prisma.partner.findUnique({
      where: { partnerCode },
    });
  }

  /**
   * 新しい取引先を作成
   */
  static async createPartner(
    partner: Prisma.PartnerCreateInput,
  ): Promise<Partner> {
    return await prisma.partner.create({
      data: partner,
    });
  }

  /**
   * 取引先を更新
   */
  static async updatePartner(
    partnerCode: string,
    updates: Prisma.PartnerUpdateInput,
  ): Promise<Partner> {
    return await prisma.partner.update({
      where: { partnerCode },
      data: updates,
    });
  }

  /**
   * 取引先を削除
   */
  static async deletePartner(partnerCode: string): Promise<void> {
    await prisma.partner.delete({
      where: { partnerCode },
    });
  }
}

/**
 * 分析コードマスタ操作（Prisma版）
 */
export class AnalysisCodeService {
  /**
   * 全分析コードを取得
   */
  static async getAnalysisCodes(): Promise<AnalysisCode[]> {
    return await prisma.analysisCode.findMany({
      orderBy: [
        { analysisType: "asc" },
        { sortOrder: "asc" },
        { analysisCode: "asc" },
      ],
    });
  }

  /**
   * 階層構造で分析コードを取得
   */
  static async getAnalysisCodesHierarchy(): Promise<AnalysisCode[]> {
    return await prisma.analysisCode.findMany({
      where: { isActive: true },
      include: {
        childAnalysisCodes: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [
        { analysisType: "asc" },
        { sortOrder: "asc" },
        { analysisCode: "asc" },
      ],
    });
  }

  /**
   * 分析コードで取得
   */
  static async getAnalysisCodeByCode(
    analysisCode: string,
  ): Promise<AnalysisCode | null> {
    return await prisma.analysisCode.findUnique({
      where: { analysisCode },
      include: {
        childAnalysisCodes: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        parentAnalysisCode_rel: true,
      },
    });
  }

  /**
   * 新しい分析コードを作成
   */
  static async createAnalysisCode(
    analysisCode: Prisma.AnalysisCodeCreateInput,
  ): Promise<AnalysisCode> {
    return await prisma.analysisCode.create({
      data: analysisCode,
    });
  }

  /**
   * 分析コードを更新
   */
  static async updateAnalysisCode(
    analysisCode: string,
    updates: Prisma.AnalysisCodeUpdateInput,
  ): Promise<AnalysisCode> {
    return await prisma.analysisCode.update({
      where: { analysisCode },
      data: updates,
    });
  }

  /**
   * 分析コードを削除
   */
  static async deleteAnalysisCode(analysisCode: string): Promise<void> {
    await prisma.analysisCode.delete({
      where: { analysisCode },
    });
  }
}
