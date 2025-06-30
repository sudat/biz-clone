/**
 * 検索・分析用データベース操作
 * ============================================================================
 * 統合検索、試算表、仕訳集計などの高度なクエリ操作
 * ============================================================================
 */

import { prisma, getPrismaClient } from "./prisma";
import { Decimal } from "@prisma/client/runtime/library";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Hyperdrive } from "@cloudflare/workers-types";

// ユーティリティ関数：Decimalを数値に変換
function convertDecimalToNumber(decimal: Decimal | null | undefined): number {
  if (!decimal) return 0;
  return decimal.toNumber();
}

// 検索キーワードのサニタイズ
function sanitizeSearchTerm(term: string): string {
  if (!term || typeof term !== 'string') return '';
  
  // 基本的なサニタイズ
  let sanitized = term.trim();
  
  // SQLインジェクション対策（LIKE句用）
  sanitized = sanitized.replace(/[%_\\]/g, '\\$&');
  
  // 過度に長い検索語は切り詰め
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized;
}

// ページネーション検証
function validatePagination(page: number = 1, limit: number = 10): { skip: number; take: number } {
  const validatedPage = Math.max(1, Math.floor(page));
  const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  return {
    skip: (validatedPage - 1) * validatedLimit,
    take: validatedLimit
  };
}

// ====================
// 統合検索機能
// ====================

export interface UnifiedSearchParams {
  query: string;
  categories?: ('journals' | 'accounts' | 'partners' | 'departments' | 'analysis_codes')[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface UnifiedSearchResult {
  query: string;
  searchCategories: string[];
  results: {
    journals?: {
      count: number;
      items: any[];
      hasMore: boolean;
    };
    accounts?: {
      count: number;
      items: any[];
      hasMore: boolean;
    };
    partners?: {
      count: number;
      items: any[];
      hasMore: boolean;
    };
    departments?: {
      count: number;
      items: any[];
      hasMore: boolean;
    };
    analysis_codes?: {
      count: number;
      items: any[];
      hasMore: boolean;
    };
  };
}

export async function performUnifiedSearch(params: UnifiedSearchParams, hyperdrive?: Hyperdrive): Promise<UnifiedSearchResult> {
  try {
    const { query, categories, dateFrom, dateTo, page = 1, limit = 10 } = params;
    const sanitizedQuery = sanitizeSearchTerm(query);
    
    if (!sanitizedQuery) {
      throw new Error('検索クエリを入力してください');
    }

    const searchCategories = categories || ['journals', 'accounts', 'partners', 'departments', 'analysis_codes'];
    const pagination = validatePagination(page, limit);
    const client = getPrismaClient(hyperdrive);
    const results: any = {};

  // 仕訳検索
  if (searchCategories.includes('journals')) {
    const journalWhere: any = {
      OR: [
        { journalNumber: { contains: sanitizedQuery, mode: 'insensitive' as const } },
        { description: { contains: sanitizedQuery, mode: 'insensitive' as const } }
      ]
    };

    if (dateFrom || dateTo) {
      journalWhere.journalDate = {};
      if (dateFrom) journalWhere.journalDate.gte = new Date(dateFrom);
      if (dateTo) journalWhere.journalDate.lte = new Date(dateTo);
    }

    const [journals, totalJournals] = await Promise.all([
      client.journalHeader.findMany({
        where: journalWhere,
        include: {
          journalDetails: {
            include: {
              account: true,
              partner: true,
              department: true
            },
            take: 5
          }
        },
        orderBy: { journalNumber: 'desc' },
        skip: pagination.skip,
        take: pagination.take
      }),
      client.journalHeader.count({ where: journalWhere })
    ]);

    results.journals = {
      count: journals.length,
      items: journals.map(journal => ({
        ...journal,
        totalAmount: convertDecimalToNumber(journal.totalAmount),
        journalDetails: journal.journalDetails.map(detail => ({
          ...detail,
          baseAmount: convertDecimalToNumber(detail.baseAmount),
          taxAmount: convertDecimalToNumber(detail.taxAmount),
          totalAmount: convertDecimalToNumber(detail.totalAmount)
        }))
      })),
      hasMore: pagination.skip + pagination.take < totalJournals
    };
  }

  // 勘定科目検索
  if (searchCategories.includes('accounts')) {
    const accountWhere = {
      OR: [
        { accountCode: { contains: sanitizedQuery, mode: 'insensitive' as const } },
        { accountName: { contains: sanitizedQuery, mode: 'insensitive' as const } }
      ],
      isActive: true
    };

    const [accounts, totalAccounts] = await Promise.all([
      client.account.findMany({
        where: accountWhere,
        include: {
          defaultTaxRate: true
        },
        orderBy: { accountCode: 'asc' },
        skip: pagination.skip,
        take: pagination.take
      }),
      client.account.count({ where: accountWhere })
    ]);

    results.accounts = {
      count: accounts.length,
      items: accounts.map(account => ({
        ...account,
        defaultTaxRate: account.defaultTaxRate ? {
          ...account.defaultTaxRate,
          taxRate: convertDecimalToNumber(account.defaultTaxRate.taxRate)
        } : null
      })),
      hasMore: pagination.skip + pagination.take < totalAccounts
    };
  }

  // 取引先検索
  if (searchCategories.includes('partners')) {
    const partnerWhere = {
      OR: [
        { partnerCode: { contains: sanitizedQuery, mode: 'insensitive' as const } },
        { partnerName: { contains: sanitizedQuery, mode: 'insensitive' as const } },
        { partnerKana: { contains: sanitizedQuery, mode: 'insensitive' as const } }
      ],
      isActive: true
    };

    const [partners, totalPartners] = await Promise.all([
      client.partner.findMany({
        where: partnerWhere,
        orderBy: { partnerCode: 'asc' },
        skip: pagination.skip,
        take: pagination.take
      }),
      client.partner.count({ where: partnerWhere })
    ]);

    results.partners = {
      count: partners.length,
      items: partners,
      hasMore: pagination.skip + pagination.take < totalPartners
    };
  }

  // 部門検索
  if (searchCategories.includes('departments')) {
    const departmentWhere = {
      OR: [
        { departmentCode: { contains: sanitizedQuery, mode: 'insensitive' as const } },
        { departmentName: { contains: sanitizedQuery, mode: 'insensitive' as const } }
      ],
      isActive: true
    };

    const [departments, totalDepartments] = await Promise.all([
      client.department.findMany({
        where: departmentWhere,
        orderBy: { departmentCode: 'asc' },
        skip: pagination.skip,
        take: pagination.take
      }),
      client.department.count({ where: departmentWhere })
    ]);

    results.departments = {
      count: departments.length,
      items: departments,
      hasMore: pagination.skip + pagination.take < totalDepartments
    };
  }

  // 分析コード検索
  if (searchCategories.includes('analysis_codes')) {
    const analysisCodeWhere = {
      OR: [
        { analysisCode: { contains: sanitizedQuery, mode: 'insensitive' as const } },
        { analysisName: { contains: sanitizedQuery, mode: 'insensitive' as const } }
      ],
      isActive: true
    };

    const [analysisCodes, totalAnalysisCodes] = await Promise.all([
      client.analysisCode.findMany({
        where: analysisCodeWhere,
        include: {
          analysisTypeRel: true
        },
        orderBy: { analysisCode: 'asc' },
        skip: pagination.skip,
        take: pagination.take
      }),
      client.analysisCode.count({ where: analysisCodeWhere })
    ]);

    results.analysis_codes = {
      count: analysisCodes.length,
      items: analysisCodes,
      hasMore: pagination.skip + pagination.take < totalAnalysisCodes
    };
  }

    return {
      query: sanitizedQuery,
      searchCategories,
      results
    };
  } catch (error) {
    console.error('統合検索処理エラー:', error);
    throw error instanceof Error 
      ? error 
      : new Error('統合検索の実行中に予期しないエラーが発生しました');
  }
}

// ====================
// 試算表機能
// ====================

export interface TrialBalanceParams {
  dateFrom: string;
  dateTo: string;
  accountType?: '資産' | '負債' | '純資産' | '収益' | '費用';
  includeZeroBalance?: boolean;
}

export interface TrialBalanceItem {
  account: any;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface TrialBalanceResult {
  period: { dateFrom: string; dateTo: string };
  accountType: string;
  trialBalance: TrialBalanceItem[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    totalBalance: number;
  };
  itemCount: number;
}

export async function getTrialBalance(params: TrialBalanceParams, hyperdrive?: Hyperdrive): Promise<TrialBalanceResult> {
  const { dateFrom, dateTo, accountType, includeZeroBalance = false } = params;
  
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  const client = getPrismaClient(hyperdrive);

  // 対象期間の仕訳明細を取得
  const journalDetails = await client.journalDetail.findMany({
    where: {
      journalHeader: {
        journalDate: {
          gte: startDate,
          lte: endDate
        },
        approvalStatus: 'approved'
      },
      ...(accountType && {
        account: {
          accountType: accountType
        }
      })
    },
    include: {
      account: true,
      journalHeader: true
    }
  });

  // 勘定科目ごとに集計
  const balanceMap = new Map<string, TrialBalanceItem>();

  journalDetails.forEach(detail => {
    const accountCode = detail.accountCode;
    const amount = convertDecimalToNumber(detail.totalAmount);
    
    if (!balanceMap.has(accountCode)) {
      balanceMap.set(accountCode, {
        account: detail.account,
        debitTotal: 0,
        creditTotal: 0,
        balance: 0
      });
    }

    const item = balanceMap.get(accountCode)!;
    
    if (detail.debitCredit === 'D') {
      item.debitTotal += amount;
    } else {
      item.creditTotal += amount;
    }
    
    // 残高計算（資産・費用は借方残高、負債・純資産・収益は貸方残高）
    const accountTypeValue = detail.account.accountType;
    if (['資産', '費用'].includes(accountTypeValue)) {
      item.balance = item.debitTotal - item.creditTotal;
    } else {
      item.balance = item.creditTotal - item.debitTotal;
    }
  });

  // 結果を配列に変換
  let trialBalance = Array.from(balanceMap.values());

  // 残高0の科目を除外（オプション）
  if (!includeZeroBalance) {
    trialBalance = trialBalance.filter(item => Math.abs(item.balance) >= 0.01);
  }

  // 勘定科目コード順でソート
  trialBalance.sort((a, b) => a.account.accountCode.localeCompare(b.account.accountCode));

  // 合計計算
  const summary = {
    totalDebit: trialBalance.reduce((sum, item) => sum + item.debitTotal, 0),
    totalCredit: trialBalance.reduce((sum, item) => sum + item.creditTotal, 0),
    totalBalance: trialBalance.reduce((sum, item) => sum + Math.abs(item.balance), 0)
  };

  return {
    period: { dateFrom, dateTo },
    accountType: accountType || '全て',
    trialBalance,
    summary,
    itemCount: trialBalance.length
  };
}

// ====================
// 仕訳集計機能
// ====================

export interface JournalSummaryParams {
  dateFrom: string;
  dateTo: string;
  groupBy?: 'account' | 'partner' | 'department' | 'month' | 'day';
  accountType?: '資産' | '負債' | '純資産' | '収益' | '費用';
}

export interface JournalSummaryResult {
  period: { dateFrom: string; dateTo: string };
  groupBy: string;
  accountType: string;
  summary: any[];
  totalSummary: {
    totalDebit: number;
    totalCredit: number;
    totalTransactions: number;
  };
  itemCount: number;
}

export async function getJournalSummary(params: JournalSummaryParams, hyperdrive?: Hyperdrive): Promise<JournalSummaryResult> {
  const { dateFrom, dateTo, groupBy = 'account', accountType } = params;
  
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);

  // 基本クエリ
  const baseWhere = {
    journalHeader: {
      journalDate: {
        gte: startDate,
        lte: endDate
      },
      approvalStatus: 'approved'
    },
    ...(accountType && {
      account: {
        accountType: accountType
      }
    })
  };

  let includeQuery: any;
  let orderBy: any;

  switch (groupBy) {
    case 'account':
      includeQuery = {
        account: {
          select: {
            accountCode: true,
            accountName: true,
            accountType: true
          }
        }
      };
      orderBy = { accountCode: 'asc' };
      break;

    case 'partner':
      includeQuery = {
        partner: {
          select: {
            partnerCode: true,
            partnerName: true,
            partnerType: true
          }
        }
      };
      orderBy = { partnerCode: 'asc' };
      break;

    case 'department':
      includeQuery = {
        department: {
          select: {
            departmentCode: true,
            departmentName: true
          }
        }
      };
      orderBy = { departmentCode: 'asc' };
      break;

    default:
      includeQuery = {
        account: {
          select: {
            accountCode: true,
            accountName: true,
            accountType: true
          }
        }
      };
      orderBy = { accountCode: 'asc' };
  }

  const client = getPrismaClient(hyperdrive);

  // 明細データ取得
  const journalDetails = await client.journalDetail.findMany({
    where: baseWhere,
    include: {
      ...includeQuery,
      journalHeader: {
        select: {
          journalDate: true
        }
      }
    },
    orderBy
  });

  // データ集計
  const summaryMap = new Map();

  journalDetails.forEach((detail: any) => {
    let key: string;
    let groupInfo: any;

    switch (groupBy) {
      case 'account':
        key = detail.accountCode;
        groupInfo = {
          code: detail.accountCode,
          name: detail.account?.accountName,
          type: detail.account?.accountType
        };
        break;

      case 'partner':
        key = detail.partnerCode || 'その他';
        groupInfo = {
          code: detail.partnerCode,
          name: detail.partner?.partnerName,
          type: detail.partner?.partnerType
        };
        break;

      case 'department':
        key = detail.departmentCode || 'その他';
        groupInfo = {
          code: detail.departmentCode,
          name: detail.department?.departmentName
        };
        break;

      case 'month':
        const monthKey = detail.journalHeader.journalDate.toISOString().slice(0, 7);
        key = monthKey;
        groupInfo = {
          period: monthKey,
          type: '月次'
        };
        break;

      case 'day':
        const dayKey = detail.journalHeader.journalDate.toISOString().slice(0, 10);
        key = dayKey;
        groupInfo = {
          period: dayKey,
          type: '日次'
        };
        break;

      default:
        key = detail.accountCode;
        groupInfo = {
          code: detail.accountCode,
          name: detail.account?.accountName
        };
    }

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        ...groupInfo,
        debitTotal: 0,
        creditTotal: 0,
        transactionCount: 0
      });
    }

    const summary = summaryMap.get(key);
    const amount = convertDecimalToNumber(detail.totalAmount);

    if (detail.debitCredit === 'D') {
      summary.debitTotal += amount;
    } else {
      summary.creditTotal += amount;
    }
    summary.transactionCount++;
  });

  const summaryData = Array.from(summaryMap.values());

  // 全体合計
  const totalSummary = {
    totalDebit: summaryData.reduce((sum, item) => sum + item.debitTotal, 0),
    totalCredit: summaryData.reduce((sum, item) => sum + item.creditTotal, 0),
    totalTransactions: summaryData.reduce((sum, item) => sum + item.transactionCount, 0)
  };

  return {
    period: { dateFrom, dateTo },
    groupBy,
    accountType: accountType || '全て',
    summary: summaryData,
    totalSummary,
    itemCount: summaryData.length
  };
}