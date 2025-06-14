/**
 * 試算表用Server Actions
 * ============================================================================
 * 勘定科目別残高の計算・集計処理
 * ============================================================================
 */

"use server";

import { prisma } from "@/lib/database/prisma";

// 試算表データ型定義
export interface TrialBalanceData {
  accountCode: string;
  accountName: string;
  subAccountCode?: string;
  subAccountName?: string;
  accountType: string;
  level: number;
  openingBalance: number; // 期首残高（純額）
  debitAmount: number; // 借方計上額
  creditAmount: number; // 貸方計上額
  closingBalance: number; // 期末残高（純額）
}

// 試算表検索パラメータ
export interface TrialBalanceParams {
  dateFrom: Date;
  dateTo: Date;
  accountCodeFrom?: string;
  accountCodeTo?: string;
  accountType?: string;
  includeZeroBalance?: boolean;
  includeSubAccounts?: boolean;
}

/**
 * 試算表データを取得
 */
export async function getTrialBalanceData(
  params: TrialBalanceParams,
): Promise<{
  success: boolean;
  data?: TrialBalanceData[];
  error?: string;
}> {
  try {
    const {
      dateFrom,
      dateTo,
      accountCodeFrom,
      accountCodeTo,
      accountType,
      includeZeroBalance = true,
      includeSubAccounts = true,
    } = params;

    // 勘定科目マスタを取得（階層構造対応）
    const accountsWhere: Record<string, unknown> = {
      isActive: true,
    };

    if (accountCodeFrom || accountCodeTo) {
      accountsWhere.accountCode = {};
      if (accountCodeFrom) {
        (accountsWhere.accountCode as Record<string, unknown>).gte =
          accountCodeFrom;
      }
      if (accountCodeTo) {
        (accountsWhere.accountCode as Record<string, unknown>).lte =
          accountCodeTo;
      }
    }

    if (accountType) {
      accountsWhere.accountType = accountType;
    }

    const accounts = await prisma.account.findMany({
      where: accountsWhere,
      include: {
        subAccounts: includeSubAccounts
          ? {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          }
          : false,
      },
      orderBy: { accountCode: "asc" },
    });

    const trialBalanceData: TrialBalanceData[] = [];

    // 各勘定科目の残高を計算
    for (const account of accounts) {
      // 勘定科目レベルの計算
      const accountBalance = await calculateAccountBalance(
        account.accountCode,
        null,
        dateFrom,
        dateTo,
      );

      if (includeZeroBalance || accountBalance.closingBalance !== 0) {
        trialBalanceData.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          level: 0,
          ...accountBalance,
        });
      }

      // 補助科目レベルの計算
      if (includeSubAccounts && account.subAccounts) {
        for (const subAccount of account.subAccounts) {
          const subAccountBalance = await calculateAccountBalance(
            account.accountCode,
            subAccount.subAccountCode,
            dateFrom,
            dateTo,
          );

          if (includeZeroBalance || subAccountBalance.closingBalance !== 0) {
            trialBalanceData.push({
              accountCode: account.accountCode,
              accountName: account.accountName,
              subAccountCode: subAccount.subAccountCode,
              subAccountName: subAccount.subAccountName,
              accountType: account.accountType,
              level: 1,
              ...subAccountBalance,
            });
          }
        }
      }
    }

    return {
      success: true,
      data: trialBalanceData,
    };
  } catch (error) {
    console.error("試算表データ取得エラー:", error);
    return {
      success: false,
      error: "試算表データの取得に失敗しました",
    };
  }
}

/**
 * 勘定科目・補助科目の残高を計算
 */
async function calculateAccountBalance(
  accountCode: string,
  subAccountCode: string | null,
  dateFrom: Date,
  dateTo: Date,
): Promise<{
  openingBalance: number;
  debitAmount: number;
  creditAmount: number;
  closingBalance: number;
}> {
  // 共通のwhere条件
  const baseWhere = {
    accountCode,
    ...(subAccountCode ? { subAccountCode } : {}),
  };

  // 期首残高計算（開始日より前の仕訳から借方-貸方を集計）
  const openingBalanceResult = await prisma.journalDetail.aggregate({
    where: {
      ...baseWhere,
      journalHeader: {
        journalDate: {
          lt: dateFrom,
        },
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // 期中の借方・貸方計上額を別々に集計
  const [debitResult, creditResult] = await Promise.all([
    // 借方計上額
    prisma.journalDetail.aggregate({
      where: {
        ...baseWhere,
        debitCredit: "D",
        journalHeader: {
          journalDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    // 貸方計上額
    prisma.journalDetail.aggregate({
      where: {
        ...baseWhere,
        debitCredit: "C",
        journalHeader: {
          journalDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  // 期首残高の計算（借方はプラス、貸方はマイナスで計算）
  const openingDebitResult = await prisma.journalDetail.aggregate({
    where: {
      ...baseWhere,
      debitCredit: "D",
      journalHeader: {
        journalDate: {
          lt: dateFrom,
        },
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  const openingCreditResult = await prisma.journalDetail.aggregate({
    where: {
      ...baseWhere,
      debitCredit: "C",
      journalHeader: {
        journalDate: {
          lt: dateFrom,
        },
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // 数値変換（Decimal → number）
  const openingDebit = openingDebitResult._sum.totalAmount?.toNumber() || 0;
  const openingCredit = openingCreditResult._sum.totalAmount?.toNumber() || 0;
  const debitAmount = debitResult._sum.totalAmount?.toNumber() || 0;
  const creditAmount = creditResult._sum.totalAmount?.toNumber() || 0;

  // 残高計算（借方-貸方の純額）
  const openingBalance = openingDebit - openingCredit;
  const closingBalance = openingBalance + debitAmount - creditAmount;

  return {
    openingBalance,
    debitAmount,
    creditAmount,
    closingBalance,
  };
}

/**
 * 試算表の集計サマリーを取得
 */
export async function getTrialBalanceSummary(
  data: TrialBalanceData[],
): Promise<{
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;
}> {
  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalDebitAmount = 0;
  let totalCreditAmount = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  data.forEach((item) => {
    // 期首残高の借方・貸方分離
    if (item.openingBalance >= 0) {
      totalOpeningDebit += item.openingBalance;
    } else {
      totalOpeningCredit += Math.abs(item.openingBalance);
    }

    // 期中計上額
    totalDebitAmount += item.debitAmount;
    totalCreditAmount += item.creditAmount;

    // 期末残高の借方・貸方分離
    if (item.closingBalance >= 0) {
      totalClosingDebit += item.closingBalance;
    } else {
      totalClosingCredit += Math.abs(item.closingBalance);
    }
  });

  // 借貸バランスチェック
  const isBalanced = Math.abs(totalOpeningDebit - totalOpeningCredit) < 0.01 &&
    Math.abs(totalDebitAmount - totalCreditAmount) < 0.01 &&
    Math.abs(totalClosingDebit - totalClosingCredit) < 0.01;

  return {
    totalOpeningDebit,
    totalOpeningCredit,
    totalDebitAmount,
    totalCreditAmount,
    totalClosingDebit,
    totalClosingCredit,
    isBalanced,
  };
}
