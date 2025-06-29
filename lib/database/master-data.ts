/**
 * Master Data Database Operations
 * ============================================================================
 * マスタデータの統一的なデータベース操作
 * ============================================================================
 */

import { prisma } from './prisma';
import type {
  Account,
  Partner,
  AnalysisCode
} from '@/types/unified';

// ====================
// 共通型定義
// ====================

export interface SearchFilters {
  searchTerm?: string;
  isActive?: boolean;
  accountType?: string;
  partnerType?: string;
  analysisType?: string;
  parentCode?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ====================
// 勘定科目操作
// ====================

export class AccountService {
  /**
   * 勘定科目検索
   */
  static async search(
    filters: SearchFilters = {},
    options: PaginationOptions = {}
  ): Promise<SearchResult<Account>> {
    const {
      searchTerm,
      isActive = true,
      accountType
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'accountCode',
      sortOrder = 'asc'
    } = options;

    const where: any = {
      isActive
    };

    if (searchTerm) {
      where.OR = [
        { accountCode: { contains: searchTerm, mode: 'insensitive' } },
        { accountName: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    if (accountType) {
      where.accountType = accountType;
    }

    const offset = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          defaultTaxRate: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit
      }),
      prisma.account.count({ where })
    ]);

    return {
      data: accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 勘定科目作成
   */
  static async create(data: {
    accountCode: string;
    accountName: string;
    accountType: string;
    sortOrder?: number;
    defaultTaxCode?: string;
  }): Promise<Account> {
    // 重複チェック
    const existing = await prisma.account.findUnique({
      where: { accountCode: data.accountCode }
    });

    if (existing) {
      throw new Error(`勘定科目コード「${data.accountCode}」は既に存在します`);
    }

    // デフォルト税区分の設定
    let defaultTaxCode = data.defaultTaxCode;
    if (!defaultTaxCode) {
      if (['資産', '負債', '純資産'].includes(data.accountType)) {
        defaultTaxCode = 'TAX0'; // 不課税
      } else if (['収益', '費用'].includes(data.accountType)) {
        defaultTaxCode = 'TAX10'; // 課税
      }
    }

    return await prisma.account.create({
      data: {
        accountCode: data.accountCode,
        accountName: data.accountName,
        accountType: data.accountType,
        isDetail: true,
        isActive: true,
        sortOrder: data.sortOrder || null,
        defaultTaxCode: defaultTaxCode || null
      },
      include: {
        defaultTaxRate: true
      }
    });
  }

  /**
   * 勘定科目更新
   */
  static async update(
    accountCode: string,
    data: Partial<{
      accountName: string;
      accountType: string;
      sortOrder: number;
      defaultTaxCode: string;
    }>
  ): Promise<Account> {
    const existing = await prisma.account.findUnique({
      where: { accountCode }
    });

    if (!existing) {
      throw new Error(`勘定科目コード「${accountCode}」が見つかりません`);
    }

    return await prisma.account.update({
      where: { accountCode },
      data,
      include: {
        defaultTaxRate: true
      }
    });
  }

  /**
   * 勘定科目削除
   */
  static async delete(accountCode: string): Promise<void> {
    const existing = await prisma.account.findUnique({
      where: { accountCode }
    });

    if (!existing) {
      throw new Error(`勘定科目コード「${accountCode}」が見つかりません`);
    }

    // 使用中チェック（仕訳詳細に使用されていないか）
    const usageCount = await prisma.journalDetail.count({
      where: { accountCode }
    });

    if (usageCount > 0) {
      throw new Error(`勘定科目「${accountCode}」は仕訳で使用中のため削除できません`);
    }

    await prisma.account.delete({
      where: { accountCode }
    });
  }
}

// ====================
// 取引先操作
// ====================

export class PartnerService {
  /**
   * 取引先検索
   */
  static async search(
    filters: SearchFilters = {},
    options: PaginationOptions = {}
  ): Promise<SearchResult<Partner>> {
    const {
      searchTerm,
      isActive = true,
      partnerType
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'partnerCode',
      sortOrder = 'asc'
    } = options;

    const where: any = {
      isActive
    };

    if (searchTerm) {
      where.OR = [
        { partnerCode: { contains: searchTerm, mode: 'insensitive' } },
        { partnerName: { contains: searchTerm, mode: 'insensitive' } },
        { partnerKana: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    if (partnerType) {
      where.partnerType = partnerType;
    }

    const offset = (page - 1) * limit;

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit
      }),
      prisma.partner.count({ where })
    ]);

    return {
      data: partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 取引先作成
   */
  static async create(data: {
    partnerCode: string;
    partnerName: string;
    partnerKana?: string;
    partnerType: string;
    address?: string;
    phone?: string;
    email?: string;
  }): Promise<Partner> {
    // 重複チェック
    const existing = await prisma.partner.findUnique({
      where: { partnerCode: data.partnerCode }
    });

    if (existing) {
      throw new Error(`取引先コード「${data.partnerCode}」は既に存在します`);
    }

    return await prisma.partner.create({
      data: {
        partnerCode: data.partnerCode,
        partnerName: data.partnerName,
        partnerKana: data.partnerKana || null,
        partnerType: data.partnerType,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        isActive: true
      }
    });
  }

  /**
   * 取引先更新
   */
  static async update(
    partnerCode: string,
    data: Partial<{
      partnerName: string;
      partnerKana: string;
      partnerType: string;
      address: string;
      phone: string;
      email: string;
    }>
  ): Promise<Partner> {
    const existing = await prisma.partner.findUnique({
      where: { partnerCode }
    });

    if (!existing) {
      throw new Error(`取引先コード「${partnerCode}」が見つかりません`);
    }

    return await prisma.partner.update({
      where: { partnerCode },
      data
    });
  }

  /**
   * 取引先削除
   */
  static async delete(partnerCode: string): Promise<void> {
    const existing = await prisma.partner.findUnique({
      where: { partnerCode }
    });

    if (!existing) {
      throw new Error(`取引先コード「${partnerCode}」が見つかりません`);
    }

    // 使用中チェック（仕訳詳細に使用されていないか）
    const usageCount = await prisma.journalDetail.count({
      where: { partnerCode }
    });

    if (usageCount > 0) {
      throw new Error(`取引先「${partnerCode}」は仕訳で使用中のため削除できません`);
    }

    await prisma.partner.delete({
      where: { partnerCode }
    });
  }
}

// ====================
// 部門操作
// ====================

export class DepartmentService {
  /**
   * 部門検索
   */
  static async search(
    filters: SearchFilters = {},
    options: PaginationOptions = {}
  ): Promise<SearchResult<any>> {
    const {
      searchTerm,
      isActive = true
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = options;

    const where: any = {
      isActive
    };

    if (searchTerm) {
      where.OR = [
        { departmentCode: { contains: searchTerm, mode: 'insensitive' } },
        { departmentName: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    const offset = (page - 1) * limit;

    const orderBy = sortBy === 'sortOrder' 
      ? [{ sortOrder: sortOrder }, { departmentCode: 'asc' }]
      : { [sortBy]: sortOrder };

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        orderBy: orderBy as any,
        skip: offset,
        take: limit
      }),
      prisma.department.count({ where })
    ]);

    return {
      data: departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 部門作成
   */
  static async create(data: {
    departmentCode: string;
    departmentName: string;
    sortOrder?: number;
  }): Promise<any> {
    // 重複チェック
    const existing = await prisma.department.findUnique({
      where: { departmentCode: data.departmentCode }
    });

    if (existing) {
      throw new Error(`部門コード「${data.departmentCode}」は既に存在します`);
    }

    return await prisma.department.create({
      data: {
        departmentCode: data.departmentCode,
        departmentName: data.departmentName,
        isActive: true,
        sortOrder: data.sortOrder || null
      }
    });
  }

  /**
   * 部門更新
   */
  static async update(
    departmentCode: string,
    data: Partial<{
      departmentName: string;
      sortOrder: number;
    }>
  ): Promise<any> {
    const existing = await prisma.department.findUnique({
      where: { departmentCode }
    });

    if (!existing) {
      throw new Error(`部門コード「${departmentCode}」が見つかりません`);
    }

    return await prisma.department.update({
      where: { departmentCode },
      data
    });
  }

  /**
   * 部門削除
   */
  static async delete(departmentCode: string): Promise<void> {
    const existing = await prisma.department.findUnique({
      where: { departmentCode }
    });

    if (!existing) {
      throw new Error(`部門コード「${departmentCode}」が見つかりません`);
    }

    // 使用中チェック（仕訳詳細に使用されていないか）
    const usageCount = await prisma.journalDetail.count({
      where: { departmentCode }
    });

    if (usageCount > 0) {
      throw new Error(`部門「${departmentCode}」は仕訳で使用中のため削除できません`);
    }

    await prisma.department.delete({
      where: { departmentCode }
    });
  }
}

// ====================
// 分析コード操作
// ====================

export class AnalysisCodeService {
  /**
   * 分析コード検索
   */
  static async search(
    filters: SearchFilters = {},
    options: PaginationOptions = {}
  ): Promise<SearchResult<AnalysisCode>> {
    const {
      searchTerm,
      isActive = true,
      analysisType
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = options;

    const where: any = {
      isActive
    };

    if (searchTerm) {
      where.OR = [
        { analysisCode: { contains: searchTerm, mode: 'insensitive' } },
        { analysisName: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    if (analysisType) {
      where.analysisType = analysisType;
    }


    const offset = (page - 1) * limit;

    const orderBy = sortBy === 'sortOrder' 
      ? [{ sortOrder: sortOrder }, { analysisCode: 'asc' }]
      : { [sortBy]: sortOrder };

    const [analysisCodes, total] = await Promise.all([
      prisma.analysisCode.findMany({
        where,
        include: {
          analysisTypeRel: true
        },
        orderBy: orderBy as any,
        skip: offset,
        take: limit
      }),
      prisma.analysisCode.count({ where })
    ]);

    return {
      data: analysisCodes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 分析コード作成
   */
  static async create(data: {
    analysisCode: string;
    analysisName: string;
    analysisType: string;
    sortOrder?: number;
  }): Promise<AnalysisCode> {
    // 重複チェック
    const existing = await prisma.analysisCode.findUnique({
      where: { analysisCode: data.analysisCode }
    });

    if (existing) {
      throw new Error(`分析コード「${data.analysisCode}」は既に存在します`);
    }

    return await prisma.analysisCode.create({
      data: {
        analysisCode: data.analysisCode,
        analysisName: data.analysisName,
        analysisType: data.analysisType,
        isActive: true,
        sortOrder: data.sortOrder || null
      },
      include: {
        analysisTypeRel: true
      }
    });
  }

  /**
   * 分析コード更新
   */
  static async update(
    analysisCode: string,
    data: Partial<{
      analysisName: string;
      analysisType: string;
      sortOrder: number;
    }>
  ): Promise<AnalysisCode> {
    const existing = await prisma.analysisCode.findUnique({
      where: { analysisCode }
    });

    if (!existing) {
      throw new Error(`分析コード「${analysisCode}」が見つかりません`);
    }

    return await prisma.analysisCode.update({
      where: { analysisCode },
      data,
      include: {
        analysisTypeRel: true
      }
    });
  }

  /**
   * 分析コード削除
   */
  static async delete(analysisCode: string): Promise<void> {
    const existing = await prisma.analysisCode.findUnique({
      where: { analysisCode }
    });

    if (!existing) {
      throw new Error(`分析コード「${analysisCode}」が見つかりません`);
    }

    // 使用中チェック（仕訳詳細に使用されていないか）
    const usageCount = await prisma.journalDetail.count({
      where: { analysisCode }
    });

    if (usageCount > 0) {
      throw new Error(`分析コード「${analysisCode}」は仕訳で使用中のため削除できません`);
    }

    await prisma.analysisCode.delete({
      where: { analysisCode }
    });
  }
}