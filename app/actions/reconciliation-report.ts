/**
 * 勘定照合レポート用Server Actions
 * ============================================================================
 * 勘定照合マスタをベースに指定期間の仕訳データを集計・分析する機能
 * ============================================================================
 */

"use server";

import { prisma } from "@/lib/database/prisma";
import type { ReconciliationMapping } from "@prisma/client";

// 勘定照合レポートデータ型定義
export interface ReconciliationReportData {
  mappingId: string;
  departmentCode: string;
  departmentName: string;
  accountCode: string;
  accountName: string;
  counterDepartmentCode: string;
  counterDepartmentName: string;
  counterAccountCode: string;
  counterAccountName: string;
  description: string | null;

  // 計上部門・勘定科目の集計金額
  primaryDebitAmount: number; // 借方金額
  primaryCreditAmount: number; // 貸方金額
  primaryNetAmount: number; // 純額（借方-貸方）

  // 相手計上部門・相手勘定科目の集計金額
  counterDebitAmount: number; // 借方金額
  counterCreditAmount: number; // 貸方金額
  counterNetAmount: number; // 純額（借方-貸方）

  // 照合状況
  difference: number; // 差額（primary - counter）
  isMatched: boolean; // 照合一致フラグ

  // 件数情報
  primaryTransactionCount: number; // 計上部門・勘定科目の仕訳件数
  counterTransactionCount: number; // 相手計上部門・相手勘定科目の仕訳件数
}

// 勘定照合明細データ型定義
export interface ReconciliationDetailData {
  journalNumber: string;
  journalDate: Date;
  lineNumber: number;
  debitCredit: string;
  accountCode: string;
  accountName: string;
  departmentCode: string | null;
  departmentName: string | null;
  subAccountCode: string | null;
  subAccountName: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  analysisCode: string | null;
  analysisCodeName: string | null;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxCode: string | null;
  lineDescription: string | null;
  description: string | null; // ヘッダーの摘要
}

// 検索パラメータ
export interface ReconciliationReportParams {
  dateFrom: Date;
  dateTo: Date;
  departmentCode?: string;
  accountCode?: string;
  counterDepartmentCode?: string;
  counterAccountCode?: string;
  includeMatched?: boolean; // 照合一致分を含むか
  includeUnmatched?: boolean; // 照合不一致分を含むか
  amountThreshold?: number; // 差額しきい値
  approvalStatuses?: ("pending" | "approved")[]; // 承認ステータスフィルタ
}

/**
 * 勘定照合レポートデータを取得
 */
export async function getReconciliationReportData(
  params: ReconciliationReportParams,
): Promise<{
  success: boolean;
  data?: ReconciliationReportData[];
  error?: string;
}> {
  try {
    const {
      dateFrom,
      dateTo,
      departmentCode,
      accountCode,
      counterDepartmentCode,
      counterAccountCode,
      includeMatched = true,
      includeUnmatched = true,
      approvalStatuses = ["approved"],
    } = params;

    // 勘定照合マスタを取得（フィルタ条件適用）
    const mappingsWhere: Record<string, unknown> = {
      isActive: true,
    };

    if (departmentCode) {
      mappingsWhere.departmentCode = departmentCode;
    }
    if (accountCode) {
      mappingsWhere.accountCode = accountCode;
    }
    if (counterDepartmentCode) {
      mappingsWhere.counterDepartmentCode = counterDepartmentCode;
    }
    if (counterAccountCode) {
      mappingsWhere.counterAccountCode = counterAccountCode;
    }

    const reconciliationMappings = await prisma.reconciliationMapping.findMany({
      where: mappingsWhere,
      orderBy: [
        { departmentCode: "asc" },
        { accountCode: "asc" },
        { counterDepartmentCode: "asc" },
        { counterAccountCode: "asc" },
      ],
    });

    if (reconciliationMappings.length === 0) {
      return { success: true, data: [] };
    }

    // 各勘定照合マッピングの集計を並行処理で実行
    const reportData = await Promise.all(
      reconciliationMappings.map(async (mapping) => {
        // 関連名称を取得
        const [
          department,
          account,
          counterDepartment,
          counterAccount,
        ] = await Promise.all([
          prisma.department.findUnique({
            where: { departmentCode: mapping.departmentCode },
            select: { departmentName: true },
          }),
          prisma.account.findUnique({
            where: { accountCode: mapping.accountCode },
            select: { accountName: true },
          }),
          prisma.department.findUnique({
            where: { departmentCode: mapping.counterDepartmentCode },
            select: { departmentName: true },
          }),
          prisma.account.findUnique({
            where: { accountCode: mapping.counterAccountCode },
            select: { accountName: true },
          }),
        ]);

        // 計上部門・勘定科目の集計
        const primaryAggregation = await calculateReconciliationAggregation(
          mapping.departmentCode,
          mapping.accountCode,
          dateFrom,
          dateTo,
          approvalStatuses,
        );

        // 相手計上部門・相手勘定科目の集計
        const counterAggregation = await calculateReconciliationAggregation(
          mapping.counterDepartmentCode,
          mapping.counterAccountCode,
          dateFrom,
          dateTo,
          approvalStatuses,
        );

        // 差額計算と照合判定
        const difference = primaryAggregation.netAmount +
          counterAggregation.netAmount;
        const isMatched = difference === 0;

        return {
          mappingId: mapping.mappingId,
          departmentCode: mapping.departmentCode,
          departmentName: department?.departmentName || "",
          accountCode: mapping.accountCode,
          accountName: account?.accountName || "",
          counterDepartmentCode: mapping.counterDepartmentCode,
          counterDepartmentName: counterDepartment?.departmentName || "",
          counterAccountCode: mapping.counterAccountCode,
          counterAccountName: counterAccount?.accountName || "",
          description: mapping.description,

          primaryDebitAmount: primaryAggregation.debitAmount,
          primaryCreditAmount: primaryAggregation.creditAmount,
          primaryNetAmount: primaryAggregation.netAmount,

          counterDebitAmount: counterAggregation.debitAmount,
          counterCreditAmount: counterAggregation.creditAmount,
          counterNetAmount: counterAggregation.netAmount,

          difference,
          isMatched,

          primaryTransactionCount: primaryAggregation.transactionCount,
          counterTransactionCount: counterAggregation.transactionCount,
        } as ReconciliationReportData;
      }),
    );

    // フィルタリング（照合状況による絞り込み）
    const filteredData = reportData.filter((item) => {
      if (!includeMatched && item.isMatched) return false;
      if (!includeUnmatched && !item.isMatched) return false;
      return true;
    });

    return {
      success: true,
      data: filteredData,
    };
  } catch (error) {
    console.error("勘定照合レポート取得エラー:", error);
    return {
      success: false,
      error: "勘定照合レポートの取得に失敗しました",
    };
  }
}

/**
 * 部門・勘定科目の仕訳集計を計算
 */
async function calculateReconciliationAggregation(
  departmentCode: string,
  accountCode: string,
  dateFrom: Date,
  dateTo: Date,
  approvalStatuses: ("pending" | "approved")[],
): Promise<{
  debitAmount: number;
  creditAmount: number;
  netAmount: number;
  transactionCount: number;
}> {
  // 借方・貸方の金額を別々に集計
  const [debitResult, creditResult] = await Promise.all([
    // 借方集計
    prisma.journalDetail.aggregate({
      where: {
        accountCode,
        departmentCode,
        debitCredit: "D",
        journalHeader: {
          journalDate: {
            gte: dateFrom,
            lte: dateTo,
          },
          approvalStatus: {
            in: approvalStatuses,
          },
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        journalNumber: true,
      },
    }),
    // 貸方集計
    prisma.journalDetail.aggregate({
      where: {
        accountCode,
        departmentCode,
        debitCredit: "C",
        journalHeader: {
          journalDate: {
            gte: dateFrom,
            lte: dateTo,
          },
          approvalStatus: {
            in: approvalStatuses,
          },
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        journalNumber: true,
      },
    }),
  ]);

  const debitAmount = debitResult._sum.totalAmount?.toNumber() || 0;
  const creditAmount = creditResult._sum.totalAmount?.toNumber() || 0;
  const netAmount = debitAmount - creditAmount;
  const transactionCount = debitResult._count.journalNumber +
    creditResult._count.journalNumber;

  return {
    debitAmount,
    creditAmount,
    netAmount,
    transactionCount,
  };
}

/**
 * 勘定照合明細データを取得（特定の勘定照合組み合わせ）
 */
export async function getReconciliationDetailData(
  mappingId: string,
  dateFrom: Date,
  dateTo: Date,
  side: "primary" | "counter" = "primary",
  approvalStatuses: ("pending" | "approved")[] = ["pending", "approved"],
): Promise<{
  success: boolean;
  data?: ReconciliationDetailData[];
  mapping?: ReconciliationMapping;
  error?: string;
}> {
  try {
    // 勘定照合マスタを取得
    const mapping = await prisma.reconciliationMapping.findUnique({
      where: { mappingId },
    });

    if (!mapping) {
      return {
        success: false,
        error: "指定された勘定照合マスタが見つかりません",
      };
    }

    // 取得対象の部門・勘定科目を決定
    const targetDepartmentCode = side === "primary"
      ? mapping.departmentCode
      : mapping.counterDepartmentCode;
    const targetAccountCode = side === "primary"
      ? mapping.accountCode
      : mapping.counterAccountCode;

    // 明細データを取得
    const journalDetails = await prisma.journalDetail.findMany({
      where: {
        accountCode: targetAccountCode,
        departmentCode: targetDepartmentCode,
        journalHeader: {
          journalDate: {
            gte: dateFrom,
            lte: dateTo,
          },
          approvalStatus: {
            in: approvalStatuses,
          },
        },
      },
      include: {
        journalHeader: {
          select: {
            journalNumber: true,
            journalDate: true,
            description: true,
          },
        },
        account: {
          select: {
            accountName: true,
          },
        },
        subAccount: {
          select: {
            subAccountName: true,
          },
        },
        partner: {
          select: {
            partnerName: true,
          },
        },
        analysisCodeRel: {
          select: {
            analysisName: true,
          },
        },
        department: {
          select: {
            departmentName: true,
          },
        },
      },
      orderBy: [
        { journalHeader: { journalDate: "asc" } },
        { journalNumber: "asc" },
        { lineNumber: "asc" },
      ],
    });

    // データ変換
    const detailData: ReconciliationDetailData[] = journalDetails.map((
      detail,
    ) => ({
      journalNumber: detail.journalNumber,
      journalDate: detail.journalHeader.journalDate,
      lineNumber: detail.lineNumber,
      debitCredit: detail.debitCredit,
      accountCode: detail.accountCode,
      accountName: detail.account.accountName,
      departmentCode: detail.departmentCode,
      departmentName: detail.department?.departmentName || null,
      subAccountCode: detail.subAccountCode,
      subAccountName: detail.subAccount?.subAccountName || null,
      partnerCode: detail.partnerCode,
      partnerName: detail.partner?.partnerName || null,
      analysisCode: detail.analysisCode,
      analysisCodeName: detail.analysisCodeRel?.analysisName || null,
      baseAmount: detail.baseAmount.toNumber(),
      taxAmount: detail.taxAmount.toNumber(),
      totalAmount: detail.totalAmount.toNumber(),
      taxCode: detail.taxCode,
      lineDescription: detail.lineDescription,
      description: detail.journalHeader.description,
    }));

    return {
      success: true,
      data: detailData,
      mapping,
    };
  } catch (error) {
    console.error("勘定照合明細取得エラー:", error);
    return {
      success: false,
      error: "勘定照合明細の取得に失敗しました",
    };
  }
}

/**
 * 勘定照合レポートのサマリー情報を取得
 */
export async function getReconciliationReportSummary(
  data: ReconciliationReportData[],
): Promise<{
  totalMappings: number;
  matchedMappings: number;
  unmatchedMappings: number;
  totalPrimaryAmount: number;
  totalCounterAmount: number;
  totalDifference: number;
  matchRate: number;
}> {
  const totalMappings = data.length;
  const matchedMappings = data.filter((item) => item.isMatched).length;
  const unmatchedMappings = totalMappings - matchedMappings;

  const totalPrimaryAmount = data.reduce(
    (sum, item) => sum + item.primaryNetAmount,
    0,
  );
  const totalCounterAmount = data.reduce(
    (sum, item) => sum + item.counterNetAmount,
    0,
  );
  const totalDifference = Math.abs(totalPrimaryAmount - totalCounterAmount);

  const matchRate = totalMappings > 0
    ? (matchedMappings / totalMappings) * 100
    : 0;

  return {
    totalMappings,
    matchedMappings,
    unmatchedMappings,
    totalPrimaryAmount,
    totalCounterAmount,
    totalDifference,
    matchRate,
  };
}

/**
 * 部門一覧を取得（勘定照合レポート用）
 */
export async function getDepartmentsForReconciliationReport(): Promise<
  {
    success: boolean;
    data?: { departmentCode: string; departmentName: string }[];
    error?: string;
  }
> {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        departmentCode: true,
        departmentName: true,
      },
      orderBy: { departmentCode: "asc" },
    });

    return { success: true, data: departments };
  } catch (error) {
    console.error("部門一覧取得エラー:", error);
    return { success: false, error: "部門一覧の取得に失敗しました" };
  }
}

/**
 * 勘定科目一覧を取得（勘定照合レポート用）
 */
export async function getAccountsForReconciliationReport(): Promise<
  {
    success: boolean;
    data?: { accountCode: string; accountName: string }[];
    error?: string;
  }
> {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: {
        accountCode: true,
        accountName: true,
      },
      orderBy: { accountCode: "asc" },
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error("勘定科目一覧取得エラー:", error);
    return { success: false, error: "勘定科目一覧の取得に失敗しました" };
  }
}
