/**
 * 仕訳照会用Server Actions
 * ============================================================================
 * 仕訳の取得・検索・削除処理
 * ============================================================================
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
// Journal inquiry specific types

// 仕訳照会用の詳細データ型
export interface JournalInquiryData {
  journalNumber: string;
  journalDate: Date;
  description: string | null;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  details: JournalDetailInquiryData[];
}

export interface JournalDetailInquiryData {
  lineNumber: number;
  debitCredit: string;
  accountCode: string;
  accountName: string;
  subAccountCode: string | null;
  subAccountName: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  analysisCode: string | null;
  analysisCodeName: string | null;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number | null;
  taxType: string;
  lineDescription: string | null;
}

/**
 * 仕訳番号で単一仕訳を取得（関連データ含む）
 */
export async function getJournalByNumber(
  journalNumber: string
): Promise<{ success: boolean; data?: JournalInquiryData; error?: string }> {
  try {
    const journal = await prisma.journalHeader.findUnique({
      where: { journalNumber },
      include: {
        journalDetails: {
          include: {
            account: true,
            subAccount: true,
            partner: true,
            analysisCodeRel: true,
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!journal) {
      return {
        success: false,
        error: "指定された仕訳が見つかりません",
      };
    }

    // Decimal型をnumber型に変換
    const journalData: JournalInquiryData = {
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
      details: journal.journalDetails.map((detail) => ({
        lineNumber: detail.lineNumber,
        debitCredit: detail.debitCredit,
        accountCode: detail.accountCode,
        accountName: detail.account.accountName,
        subAccountCode: detail.subAccountCode,
        subAccountName: detail.subAccount?.subAccountName || null,
        partnerCode: detail.partnerCode,
        partnerName: detail.partner?.partnerName || null,
        analysisCode: detail.analysisCode,
        analysisCodeName: detail.analysisCodeRel?.analysisName || null,
        baseAmount: detail.baseAmount.toNumber(),
        taxAmount: detail.taxAmount.toNumber(),
        totalAmount: detail.totalAmount.toNumber(),
        taxRate: detail.taxRate?.toNumber() || null,
        taxType: detail.taxType,
        lineDescription: detail.lineDescription,
      })),
    };

    return {
      success: true,
      data: journalData,
    };
  } catch (error) {
    console.error("仕訳取得エラー:", error);
    return {
      success: false,
      error: "仕訳の取得に失敗しました",
    };
  }
}

/**
 * 仕訳一覧を取得（ページネーション対応）
 */
export async function getJournals(params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{
  success: boolean;
  data?: JournalInquiryData[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const { page = 1, limit = 20, searchTerm, dateFrom, dateTo } = params;
    const skip = (page - 1) * limit;

    // 検索条件の構築
    const where: Record<string, unknown> = {};

    if (searchTerm) {
      where.OR = [
        { journalNumber: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.journalDate = {};
      if (dateFrom) (where.journalDate as Record<string, unknown>).gte = dateFrom;
      if (dateTo) (where.journalDate as Record<string, unknown>).lte = dateTo;
    }

    // データ取得
    const [journals, totalCount] = await Promise.all([
      prisma.journalHeader.findMany({
        where,
        include: {
          journalDetails: {
            include: {
              account: true,
              subAccount: true,
              partner: true,
              analysisCodeRel: true,
            },
            orderBy: { lineNumber: 'asc' },
          },
        },
        orderBy: { journalDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.journalHeader.count({ where }),
    ]);

    // データ変換
    const journalData: JournalInquiryData[] = journals.map((journal) => ({
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
      details: journal.journalDetails.map((detail) => ({
        lineNumber: detail.lineNumber,
        debitCredit: detail.debitCredit,
        accountCode: detail.accountCode,
        accountName: detail.account.accountName,
        subAccountCode: detail.subAccountCode,
        subAccountName: detail.subAccount?.subAccountName || null,
        partnerCode: detail.partnerCode,
        partnerName: detail.partner?.partnerName || null,
        analysisCode: detail.analysisCode,
        analysisCodeName: detail.analysisCodeRel?.analysisName || null,
        baseAmount: detail.baseAmount.toNumber(),
        taxAmount: detail.taxAmount.toNumber(),
        totalAmount: detail.totalAmount.toNumber(),
        taxRate: detail.taxRate?.toNumber() || null,
        taxType: detail.taxType,
        lineDescription: detail.lineDescription,
      })),
    }));

    return {
      success: true,
      data: journalData,
      totalCount,
    };
  } catch (error) {
    console.error("仕訳一覧取得エラー:", error);
    return {
      success: false,
      error: "仕訳一覧の取得に失敗しました",
    };
  }
}

/**
 * 仕訳削除処理（照会画面から）
 */
export async function deleteJournalFromInquiry(
  journalNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      // 仕訳存在確認
      const journal = await tx.journalHeader.findUnique({
        where: { journalNumber },
      });

      if (!journal) {
        throw new Error("指定された仕訳が見つかりません");
      }

      // 明細削除
      await tx.journalDetail.deleteMany({
        where: { journalNumber },
      });

      // ヘッダー削除
      await tx.journalHeader.delete({
        where: { journalNumber },
      });
    });

    // キャッシュ更新
    revalidatePath("/siwake");

    return { success: true };
  } catch (error) {
    console.error("仕訳削除エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "仕訳の削除に失敗しました",
    };
  }
}

/**
 * 仕訳帳レポート用のデータ取得
 */
export async function getJournalLedgerData(params: {
  dateFrom?: Date;
  dateTo?: Date;
  accountCode?: string;
  partnerCode?: string;
}): Promise<{
  success: boolean;
  data?: JournalInquiryData[];
  error?: string;
}> {
  try {
    const { dateFrom, dateTo, accountCode, partnerCode } = params;

    // 検索条件の構築
    const where: Record<string, unknown> = {};

    // 期間指定
    if (dateFrom || dateTo) {
      where.journalDate = {};
      if (dateFrom) (where.journalDate as Record<string, unknown>).gte = dateFrom;
      if (dateTo) (where.journalDate as Record<string, unknown>).lte = dateTo;
    }

    // 勘定科目フィルタ（明細側の条件）
    const detailsWhere: Record<string, unknown> = {};
    if (accountCode) {
      detailsWhere.accountCode = accountCode;
    }
    if (partnerCode) {
      detailsWhere.partnerCode = partnerCode;
    }

    // 明細側に条件がある場合は、該当する仕訳番号を先に取得
    let journalNumbers: string[] | undefined;
    if (Object.keys(detailsWhere).length > 0) {
      const filteredDetails = await prisma.journalDetail.findMany({
        where: detailsWhere,
        select: { journalNumber: true },
        distinct: ['journalNumber'],
      });
      journalNumbers = filteredDetails.map(d => d.journalNumber);
      
      if (journalNumbers.length === 0) {
        // 条件に合う明細がない場合は空の結果を返す
        return {
          success: true,
          data: [],
        };
      }
      
      where.journalNumber = { in: journalNumbers };
    }

    // データ取得（日付順でソート）
    const journals = await prisma.journalHeader.findMany({
      where,
      include: {
        journalDetails: {
          include: {
            account: true,
            subAccount: true,
            partner: true,
            analysisCodeRel: true,
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
      orderBy: [
        { journalDate: 'asc' },
        { journalNumber: 'asc' },
      ],
    });

    // データ変換
    const journalData: JournalInquiryData[] = journals.map((journal) => ({
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
      details: journal.journalDetails.map((detail) => ({
        lineNumber: detail.lineNumber,
        debitCredit: detail.debitCredit,
        accountCode: detail.accountCode,
        accountName: detail.account.accountName,
        subAccountCode: detail.subAccountCode,
        subAccountName: detail.subAccount?.subAccountName || null,
        partnerCode: detail.partnerCode,
        partnerName: detail.partner?.partnerName || null,
        analysisCode: detail.analysisCode,
        analysisCodeName: detail.analysisCodeRel?.analysisName || null,
        baseAmount: detail.baseAmount.toNumber(),
        taxAmount: detail.taxAmount.toNumber(),
        totalAmount: detail.totalAmount.toNumber(),
        taxRate: detail.taxRate?.toNumber() || null,
        taxType: detail.taxType,
        lineDescription: detail.lineDescription,
      })),
    }));

    return {
      success: true,
      data: journalData,
    };
  } catch (error) {
    console.error("仕訳帳データ取得エラー:", error);
    return {
      success: false,
      error: "仕訳帳データの取得に失敗しました",
    };
  }
}