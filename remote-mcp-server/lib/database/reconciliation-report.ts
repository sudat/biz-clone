/**
 * 勘定照合レポート用データベース操作
 * =========================================================================
 * `app/actions/reconciliation-report.ts` のロジックを Cloudflare Workers 用に
 * 移植し、remote-mcp-server から呼び出せるユーティリティとして提供する。
 *
 * 主要公開関数:
 *   - getReconciliationSummary
 *   - getReconciliationDetail
 *
 * いずれも Hyperdrive / 直接接続を透過的に扱う `getPrismaClient` を使用する。
 */

import {
  Decimal,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import type { Hyperdrive } from "@cloudflare/workers-types";
import { getPrismaClient } from "./prisma";

// ===============================
// 型定義 (app/actions から移植)
// ===============================

export interface ReconciliationReportParams {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  departmentCode?: string;
  accountCode?: string;
  counterDepartmentCode?: string;
  counterAccountCode?: string;
  includeMatched?: boolean; // 照合一致分を含むか
  includeUnmatched?: boolean; // 照合不一致分を含むか
  amountThreshold?: number; // 差額しきい値（未使用だが将来拡張用）
  approvalStatuses?: ("pending" | "approved")[]; // 承認ステータス
}

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
  primaryDebitAmount: number;
  primaryCreditAmount: number;
  primaryNetAmount: number;
  counterDebitAmount: number;
  counterCreditAmount: number;
  counterNetAmount: number;
  difference: number;
  isMatched: boolean;
  primaryTransactionCount: number;
  counterTransactionCount: number;
}

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
  description: string | null;
}

// ===============================
// 内部ユーティリティ
// ===============================

function decimalToNumber(val: Decimal | null | undefined): number {
  return val ? val.toNumber() : 0;
}

async function calculateAggregation(
  client: any,
  departmentCode: string,
  accountCode: string,
  dateFrom: Date,
  dateTo: Date,
  approvalStatuses: ("pending" | "approved")[],
) {
  const [debit, credit] = await Promise.all([
    client.journalDetail.aggregate({
      where: {
        departmentCode,
        accountCode,
        debitCredit: "D",
        journalHeader: {
          journalDate: { gte: dateFrom, lte: dateTo },
          approvalStatus: { in: approvalStatuses },
        },
      },
      _sum: { totalAmount: true },
      _count: { journalNumber: true },
    }),
    client.journalDetail.aggregate({
      where: {
        departmentCode,
        accountCode,
        debitCredit: "C",
        journalHeader: {
          journalDate: { gte: dateFrom, lte: dateTo },
          approvalStatus: { in: approvalStatuses },
        },
      },
      _sum: { totalAmount: true },
      _count: { journalNumber: true },
    }),
  ]);

  const debitAmount = decimalToNumber(debit._sum.totalAmount);
  const creditAmount = decimalToNumber(credit._sum.totalAmount);
  return {
    debitAmount,
    creditAmount,
    netAmount: debitAmount - creditAmount,
    transactionCount: debit._count.journalNumber + credit._count.journalNumber,
  };
}

// ===============================
// 公開関数: サマリ
// ===============================

export async function getReconciliationSummary(
  params: ReconciliationReportParams,
  hyperdrive?: Hyperdrive,
): Promise<
  { success: boolean; data?: ReconciliationReportData[]; error?: string }
> {
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

    const client = getPrismaClient(hyperdrive);

    // 勘定照合マスタ取得
    const where: any = { isActive: true };
    if (departmentCode) where.departmentCode = departmentCode;
    if (accountCode) where.accountCode = accountCode;
    if (counterDepartmentCode) {
      where.counterDepartmentCode = counterDepartmentCode;
    }
    if (counterAccountCode) where.counterAccountCode = counterAccountCode;

    // Prisma クライアントの型定義に reconciliationMapping が含まれないため any キャスト
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappings = await (client as any).reconciliationMapping.findMany({
      where,
      orderBy: [
        { departmentCode: "asc" },
        { accountCode: "asc" },
        { counterDepartmentCode: "asc" },
        { counterAccountCode: "asc" },
      ],
    });

    if (mappings.length === 0) {
      return { success: true, data: [] };
    }

    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    const results = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mappings.map(async (m: any) => {
        const [dept, acct, cDept, cAcct] = await Promise.all([
          client.department.findUnique({
            where: { departmentCode: m.departmentCode },
            select: { departmentName: true },
          }),
          client.account.findUnique({
            where: { accountCode: m.accountCode },
            select: { accountName: true },
          }),
          client.department.findUnique({
            where: { departmentCode: m.counterDepartmentCode },
            select: { departmentName: true },
          }),
          client.account.findUnique({
            where: { accountCode: m.counterAccountCode },
            select: { accountName: true },
          }),
        ]);

        const primary = await calculateAggregation(
          client,
          m.departmentCode,
          m.accountCode,
          start,
          end,
          approvalStatuses,
        );
        const counter = await calculateAggregation(
          client,
          m.counterDepartmentCode,
          m.counterAccountCode,
          start,
          end,
          approvalStatuses,
        );

        const difference = primary.netAmount + counter.netAmount;
        const isMatched = difference === 0;

        return {
          mappingId: m.mappingId,
          departmentCode: m.departmentCode,
          departmentName: dept?.departmentName || "",
          accountCode: m.accountCode,
          accountName: acct?.accountName || "",
          counterDepartmentCode: m.counterDepartmentCode,
          counterDepartmentName: cDept?.departmentName || "",
          counterAccountCode: m.counterAccountCode,
          counterAccountName: cAcct?.accountName || "",
          description: m.description,
          primaryDebitAmount: primary.debitAmount,
          primaryCreditAmount: primary.creditAmount,
          primaryNetAmount: primary.netAmount,
          counterDebitAmount: counter.debitAmount,
          counterCreditAmount: counter.creditAmount,
          counterNetAmount: counter.netAmount,
          difference,
          isMatched,
          primaryTransactionCount: primary.transactionCount,
          counterTransactionCount: counter.transactionCount,
        } as ReconciliationReportData;
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = results.filter((r: any) => {
      if (!includeMatched && r.isMatched) return false;
      if (!includeUnmatched && !r.isMatched) return false;
      return true;
    });

    // 期間内に取引が全く無い場合
    const allZero = filtered.every(
      (item) =>
        item.primaryTransactionCount === 0 &&
        item.counterTransactionCount === 0,
    );

    if (allZero) {
      return {
        success: true,
        data: [],
        message: "指定期間に該当する仕訳がありませんでした",
      } as any;
    }

    return { success: true, data: filtered };
  } catch (err) {
    // Prisma テーブル未作成の場合は空データを返却
    if (
      err instanceof PrismaClientKnownRequestError &&
      (err.code === "P2021" || err.code === "P2022")
    ) {
      console.warn(
        "ReconciliationMapping テーブルが存在しません。空データを返却します。",
      );
      return { success: true, data: [] };
    }
    console.error("勘定照合サマリ取得エラー", err);
    return { success: false, error: "勘定照合サマリの取得に失敗しました" };
  }
}

// ===============================
// 公開関数: 明細
// ===============================

export async function getReconciliationDetail(
  mappingId: string,
  dateFrom: string,
  dateTo: string,
  side: "primary" | "counter" = "primary",
  approvalStatuses: ("pending" | "approved")[] = ["pending", "approved"],
  hyperdrive?: Hyperdrive,
): Promise<
  { success: boolean; data?: ReconciliationDetailData[]; error?: string }
> {
  try {
    const client = getPrismaClient(hyperdrive);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapping = await (client as any).reconciliationMapping.findUnique({
      where: { mappingId },
    });
    if (!mapping) {
      return {
        success: false,
        error: "指定された勘定照合マスタが見つかりません",
      };
    }

    const depCode = side === "primary"
      ? mapping.departmentCode
      : mapping.counterDepartmentCode;
    const accCode = side === "primary"
      ? mapping.accountCode
      : mapping.counterAccountCode;

    const details = await client.journalDetail.findMany({
      where: {
        departmentCode: depCode,
        accountCode: accCode,
        journalHeader: {
          journalDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
          approvalStatus: { in: approvalStatuses },
        },
      },
      include: {
        journalHeader: {
          select: { journalNumber: true, journalDate: true, description: true },
        },
        account: { select: { accountName: true } },
        subAccount: { select: { subAccountName: true } },
        partner: { select: { partnerName: true } },
        analysisCodeRel: { select: { analysisName: true } },
        department: { select: { departmentName: true } },
      },
      orderBy: [
        { journalHeader: { journalDate: "asc" } },
        { journalNumber: "asc" },
        { lineNumber: "asc" },
      ],
    });

    const data: ReconciliationDetailData[] = details.map((d) => ({
      journalNumber: d.journalNumber,
      journalDate: d.journalHeader.journalDate,
      lineNumber: d.lineNumber,
      debitCredit: d.debitCredit,
      accountCode: d.accountCode,
      accountName: d.account.accountName,
      departmentCode: d.departmentCode,
      departmentName: d.department?.departmentName || null,
      subAccountCode: d.subAccountCode,
      subAccountName: d.subAccount?.subAccountName || null,
      partnerCode: d.partnerCode,
      partnerName: d.partner?.partnerName || null,
      analysisCode: d.analysisCode,
      analysisCodeName: d.analysisCodeRel?.analysisName || null,
      baseAmount: decimalToNumber(d.baseAmount),
      taxAmount: decimalToNumber(d.taxAmount),
      totalAmount: decimalToNumber(d.totalAmount),
      taxCode: d.taxCode,
      lineDescription: d.lineDescription,
      description: d.journalHeader.description,
    }));

    return { success: true, data };
  } catch (err) {
    if (
      err instanceof PrismaClientKnownRequestError &&
      (err.code === "P2021" || err.code === "P2022")
    ) {
      console.warn(
        "Reconciliation テーブルが存在しません。空データを返却します。",
      );
      return { success: true, data: [] };
    }
    console.error("勘定照合明細取得エラー", err);
    return { success: false, error: "勘定照合明細の取得に失敗しました" };
  }
}
