/**
 * Journal Database Operations (MCP Compatible)
 * ============================================================================
 * MCP-server機能を移植した仕訳データベース操作
 * ============================================================================
 */

import { prisma } from "./prisma";
import { JournalNumberService } from "./journal-number";
import {
  ApiErrorType,
  ApiException,
  JournalSaveInput,
  SearchOptions,
} from "../api/types";
import { Prisma } from "@prisma/client";

// ====================
// 型定義
// ====================

export interface JournalSearchParams extends SearchOptions {
  journalNumber?: string;
  accountCode?: string;
  partnerCode?: string;
  departmentCode?: string;
  analysisCode?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: "draft" | "approved" | "all";
}

export interface JournalWithDetails {
  journalNumber: string;
  journalDate: Date;
  description: string | null;
  totalAmount: number;
  approvalStatus: string;
  createdAt: Date;
  updatedAt: Date;
  details: Array<{
    id: string;
    debitCredit: string;
    accountCode: string;
    subAccountCode: string | null;
    partnerCode: string | null;
    analysisCode: string | null;
    departmentCode: string | null;
    baseAmount: number;
    taxAmount: number;
    totalAmount: number;
    taxCode: string | null;
    description: string | null;
    account?: {
      accountName: string;
      accountType: string;
    };
    partner?: {
      partnerName: string;
    };
  }>;
  attachedFiles?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
  }>;
}

export interface PaginatedJournalResult {
  data: JournalWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ====================
// バリデーション関数
// ====================

/**
 * 借方・貸方バランスをチェック
 */
function validateJournalBalance(details: JournalSaveInput["details"]): void {
  const debitTotal = details
    .filter((detail) => detail.debitCredit === "debit")
    .reduce((sum, detail) => sum + detail.totalAmount, 0);

  const creditTotal = details
    .filter((detail) => detail.debitCredit === "credit")
    .reduce((sum, detail) => sum + detail.totalAmount, 0);

  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    throw new ApiException(
      ApiErrorType.BUSINESS,
      `借方・貸方の金額が一致しません（借方: ${debitTotal}円、貸方: ${creditTotal}円）`,
      422,
      { debitTotal, creditTotal, difference: debitTotal - creditTotal },
    );
  }
}

/**
 * マスタデータの存在チェック
 */
async function validateMasterData(
  details: JournalSaveInput["details"],
): Promise<void> {
  const accountCodes = [...new Set(details.map((d) => d.accountCode))];
  const partnerCodes = [
    ...new Set(details.map((d) => d.partnerCode).filter(Boolean)),
  ] as string[];
  const departmentCodes = [
    ...new Set(details.map((d) => d.departmentCode).filter(Boolean)),
  ] as string[];
  const analysisCodes = [
    ...new Set(details.map((d) => d.analysisCode).filter(Boolean)),
  ] as string[];

  // 勘定科目チェック
  const accounts = await prisma.account.findMany({
    where: { accountCode: { in: accountCodes } },
    select: { accountCode: true },
  });

  const missingAccounts = accountCodes.filter(
    (code) => !accounts.find((acc) => acc.accountCode === code),
  );

  if (missingAccounts.length > 0) {
    throw new ApiException(
      ApiErrorType.BUSINESS,
      `存在しない勘定科目が含まれています: ${missingAccounts.join(", ")}`,
      422,
      { missingAccounts },
    );
  }

  // 取引先チェック
  if (partnerCodes.length > 0) {
    const partners = await prisma.partner.findMany({
      where: { partnerCode: { in: partnerCodes } },
      select: { partnerCode: true },
    });

    const missingPartners = partnerCodes.filter(
      (code) => !partners.find((p) => p.partnerCode === code),
    );

    if (missingPartners.length > 0) {
      throw new ApiException(
        ApiErrorType.BUSINESS,
        `存在しない取引先が含まれています: ${missingPartners.join(", ")}`,
        422,
        { missingPartners },
      );
    }
  }

  // 部門チェック
  if (departmentCodes.length > 0) {
    const departments = await prisma.department.findMany({
      where: { departmentCode: { in: departmentCodes } },
      select: { departmentCode: true },
    });

    const missingDepartments = departmentCodes.filter(
      (code) => !departments.find((d) => d.departmentCode === code),
    );

    if (missingDepartments.length > 0) {
      throw new ApiException(
        ApiErrorType.BUSINESS,
        `存在しない部門が含まれています: ${missingDepartments.join(", ")}`,
        422,
        { missingDepartments },
      );
    }
  }

  // 分析コードチェック
  if (analysisCodes.length > 0) {
    const analysisCodeRecords = await prisma.analysisCode.findMany({
      where: { analysisCode: { in: analysisCodes } },
      select: { analysisCode: true },
    });

    const missingAnalysisCodes = analysisCodes.filter(
      (code) => !analysisCodeRecords.find((a) => a.analysisCode === code),
    );

    if (missingAnalysisCodes.length > 0) {
      throw new ApiException(
        ApiErrorType.BUSINESS,
        `存在しない分析コードが含まれています: ${
          missingAnalysisCodes.join(", ")
        }`,
        422,
        { missingAnalysisCodes },
      );
    }
  }
}

// ====================
// 仕訳CRUD操作
// ====================

/**
 * 新規仕訳保存
 */
export async function saveJournal(
  data: JournalSaveInput,
): Promise<JournalWithDetails> {
  // バリデーション
  validateJournalBalance(data.details);
  await validateMasterData(data.details);

  return await prisma.$transaction(async (tx) => {
    // 仕訳番号生成
    const journalDate = new Date(data.header.journalDate);
    const journalNumberResult = await JournalNumberService
      .generateNextJournalNumber(
        data.header.journalDate,
      );

    if (!journalNumberResult.success || !journalNumberResult.data) {
      throw new ApiException(
        ApiErrorType.INTERNAL,
        "仕訳番号の生成に失敗しました",
        500,
        { error: journalNumberResult.error },
      );
    }

    const journalNumber = journalNumberResult.data;

    // 合計金額計算
    const totalAmount = data.details.reduce((sum, detail) =>
      sum + detail.totalAmount, 0) / 2;

    // 仕訳ヘッダ作成
    const header = await tx.journalHeader.create({
      data: {
        journalNumber,
        journalDate,
        description: data.header.description || "",
        totalAmount,
        approvalStatus: "pending",
      },
    });

    // 仕訳明細作成
    const details = await Promise.all(
      data.details.map((detail, index) =>
        tx.journalDetail.create({
          data: {
            journalNumber,
            lineNumber: index + 1,
            debitCredit: detail.debitCredit === "debit" ? "D" : "C",
            accountCode: detail.accountCode,
            subAccountCode: detail.subAccountCode,
            partnerCode: detail.partnerCode,
            analysisCode: detail.analysisCode,
            departmentCode: detail.departmentCode,
            baseAmount: detail.baseAmount,
            taxAmount: detail.taxAmount,
            totalAmount: detail.totalAmount,
            taxCode: detail.taxCode,
            lineDescription: detail.description,
          },
          include: {
            account: {
              select: {
                accountName: true,
                accountType: true,
              },
            },
            partner: {
              select: {
                partnerName: true,
              },
            },
          },
        })
      ),
    );

    // 添付ファイル作成
    let attachedFiles: any[] = [];
    if (data.attachedFiles?.length) {
      attachedFiles = await Promise.all(
        data.attachedFiles.map((file) =>
          tx.journalAttachment.create({
            data: {
              journalNumber,
              fileName: file.name,
              originalFileName: file.name,
              fileUrl: file.url,
              fileSize: file.size,
              fileExtension: file.name.split(".").pop() || "",
              mimeType: file.type || "application/octet-stream",
              uploadedAt: file.uploadedAt
                ? new Date(file.uploadedAt)
                : new Date(),
            },
          })
        ),
      );
    }

    return {
      ...header,
      totalAmount: Number(header.totalAmount),
      details: details.map((detail) => ({
        ...detail,
        id: (detail as any).id?.toString() || detail.lineNumber?.toString() ||
          "1",
        baseAmount: Number(detail.baseAmount),
        taxAmount: Number(detail.taxAmount),
        totalAmount: Number(detail.totalAmount),
        description: detail.lineDescription,
      })),
      attachedFiles,
    } as JournalWithDetails;
  });
}

/**
 * 既存仕訳更新
 */
export async function updateJournal(
  journalNumber: string,
  data: JournalSaveInput,
): Promise<JournalWithDetails> {
  // バリデーション
  validateJournalBalance(data.details);
  await validateMasterData(data.details);

  return await prisma.$transaction(async (tx) => {
    // 既存仕訳の存在確認
    const existing = await tx.journalHeader.findUnique({
      where: { journalNumber },
    });

    if (!existing) {
      throw new ApiException(
        ApiErrorType.NOT_FOUND,
        `仕訳番号 ${journalNumber} が見つかりません`,
        404,
      );
    }

    // 承認済みの場合は更新不可
    if (existing.approvalStatus === "approved") {
      throw new ApiException(
        ApiErrorType.BUSINESS,
        "承認済みの仕訳は更新できません",
        422,
      );
    }

    // 既存明細削除
    await tx.journalDetail.deleteMany({
      where: { journalNumber },
    });

    // 既存添付ファイル削除
    await tx.journalAttachment.deleteMany({
      where: { journalNumber },
    });

    // 合計金額計算
    const totalAmount = data.details.reduce((sum, detail) =>
      sum + detail.totalAmount, 0) / 2;

    // ヘッダ更新
    const header = await tx.journalHeader.update({
      where: { journalNumber },
      data: {
        journalDate: new Date(data.header.journalDate),
        description: data.header.description || "",
        totalAmount,
        approvalStatus: "pending", // 承認ステータスをリセット
      },
    });

    // 新しい明細作成
    const details = await Promise.all(
      data.details.map((detail, index) =>
        tx.journalDetail.create({
          data: {
            journalNumber,
            lineNumber: index + 1,
            debitCredit: detail.debitCredit === "debit" ? "D" : "C",
            accountCode: detail.accountCode,
            subAccountCode: detail.subAccountCode,
            partnerCode: detail.partnerCode,
            analysisCode: detail.analysisCode,
            departmentCode: detail.departmentCode,
            baseAmount: detail.baseAmount,
            taxAmount: detail.taxAmount,
            totalAmount: detail.totalAmount,
            taxCode: detail.taxCode,
            lineDescription: detail.description,
          },
          include: {
            account: {
              select: {
                accountName: true,
                accountType: true,
              },
            },
            partner: {
              select: {
                partnerName: true,
              },
            },
          },
        })
      ),
    );

    // 新しい添付ファイル作成
    let attachedFiles: any[] = [];
    if (data.attachedFiles?.length) {
      attachedFiles = await Promise.all(
        data.attachedFiles.map((file) =>
          tx.journalAttachment.create({
            data: {
              journalNumber,
              fileName: file.name,
              originalFileName: file.name,
              fileUrl: file.url,
              fileSize: file.size,
              fileExtension: file.name.split(".").pop() || "",
              mimeType: file.type || "application/octet-stream",
              uploadedAt: file.uploadedAt
                ? new Date(file.uploadedAt)
                : new Date(),
            },
          })
        ),
      );
    }

    return {
      ...header,
      totalAmount: Number(header.totalAmount),
      details: details.map((detail) => ({
        ...detail,
        id: (detail as any).id?.toString() || detail.lineNumber?.toString() ||
          "1",
        baseAmount: Number(detail.baseAmount),
        taxAmount: Number(detail.taxAmount),
        totalAmount: Number(detail.totalAmount),
        description: detail.lineDescription,
      })),
      attachedFiles,
    } as JournalWithDetails;
  });
}

/**
 * 仕訳削除
 */
export async function deleteJournal(journalNumber: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 既存仕訳の存在確認
    const existing = await tx.journalHeader.findUnique({
      where: { journalNumber },
    });

    if (!existing) {
      throw new ApiException(
        ApiErrorType.NOT_FOUND,
        `仕訳番号 ${journalNumber} が見つかりません`,
        404,
      );
    }

    // 承認済みの場合は削除不可
    if (existing.approvalStatus === "approved") {
      throw new ApiException(
        ApiErrorType.BUSINESS,
        "承認済みの仕訳は削除できません",
        422,
      );
    }

    // 関連データの削除（カスケード）
    await tx.journalDetail.deleteMany({
      where: { journalNumber },
    });

    await tx.journalAttachment.deleteMany({
      where: { journalNumber },
    });

    await tx.journalHeader.delete({
      where: { journalNumber },
    });
  });
}

/**
 * 単一仕訳取得
 */
export async function getJournalByNumber(
  journalNumber: string,
): Promise<JournalWithDetails | null> {
  const journal = await prisma.journalHeader.findUnique({
    where: { journalNumber },
    include: {
      journalDetails: {
        include: {
          account: {
            select: {
              accountName: true,
              accountType: true,
            },
          },
          partner: {
            select: {
              partnerName: true,
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
      journalAttachments: true,
    },
  });

  if (!journal) return null;

  return {
    ...journal,
    totalAmount: Number(journal.totalAmount),
    details: journal.journalDetails.map((detail: any) => ({
      ...detail,
      id: detail.id?.toString() || detail.lineNumber?.toString() || "1",
      baseAmount: Number(detail.baseAmount),
      taxAmount: Number(detail.taxAmount),
      totalAmount: Number(detail.totalAmount),
      description: detail.lineDescription,
    })),
    attachedFiles: journal.journalAttachments?.map((file: any) => ({
      id: file.attachmentId,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileSize: Number(file.fileSize),
      contentType: file.mimeType,
    })) || [],
  } as JournalWithDetails;
}

/**
 * 仕訳検索
 */
export async function searchJournals(
  params: JournalSearchParams,
): Promise<PaginatedJournalResult> {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const offset = (page - 1) * limit;

  // 検索条件構築
  const where: Prisma.JournalHeaderWhereInput = {};

  if (params.filters?.journalNumber) {
    where.journalNumber = { contains: params.filters.journalNumber };
  }

  if (params.filters?.fromDate || params.filters?.toDate) {
    where.journalDate = {};
    if (params.filters.fromDate) {
      where.journalDate.gte = new Date(params.filters.fromDate);
    }
    if (params.filters.toDate) {
      where.journalDate.lte = new Date(params.filters.toDate);
    }
  }

  if (params.filters?.minAmount || params.filters?.maxAmount) {
    where.totalAmount = {};
    if (params.filters.minAmount) {
      where.totalAmount.gte = params.filters.minAmount;
    }
    if (params.filters.maxAmount) {
      where.totalAmount.lte = params.filters.maxAmount;
    }
  }

  if (params.filters?.status && params.filters.status !== "all") {
    where.approvalStatus = params.filters.status;
  }

  // 明細フィルター
  if (
    params.filters?.accountCode || params.filters?.partnerCode ||
    params.filters?.departmentCode || params.filters?.analysisCode
  ) {
    where.journalDetails = {
      some: {
        ...(params.filters.accountCode &&
          { accountCode: params.filters.accountCode }),
        ...(params.filters.partnerCode &&
          { partnerCode: params.filters.partnerCode }),
        ...(params.filters.departmentCode &&
          { departmentCode: params.filters.departmentCode }),
        ...(params.filters.analysisCode &&
          { analysisCode: params.filters.analysisCode }),
      },
    };
  }

  // 検索語句
  if (params.searchTerm) {
    where.OR = [
      { journalNumber: { contains: params.searchTerm } },
      { description: { contains: params.searchTerm } },
      {
        journalDetails: {
          some: {
            lineDescription: { contains: params.searchTerm },
          },
        },
      },
    ];
  }

  // ソート条件
  const orderBy: Prisma.JournalHeaderOrderByWithRelationInput = {};
  if (params.sortBy === "journalNumber") {
    orderBy.journalNumber = params.sortOrder || "desc";
  } else if (params.sortBy === "journalDate") {
    orderBy.journalDate = params.sortOrder || "desc";
  } else if (params.sortBy === "totalAmount") {
    orderBy.totalAmount = params.sortOrder || "desc";
  } else {
    orderBy.journalDate = "desc";
  }

  // データ取得
  const [journals, total] = await Promise.all([
    prisma.journalHeader.findMany({
      where,
      include: {
        journalDetails: {
          include: {
            account: {
              select: {
                accountName: true,
                accountType: true,
              },
            },
            partner: {
              select: {
                partnerName: true,
              },
            },
          },
          orderBy: { lineNumber: "asc" },
        },
        journalAttachments: true,
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.journalHeader.count({ where }),
  ]);

  return {
    data: journals.map((journal: any) => ({
      ...journal,
      totalAmount: Number(journal.totalAmount),
      details: journal.journalDetails?.map((detail: any) => ({
        ...detail,
        id: detail.id?.toString() || detail.lineNumber?.toString() || "1",
        baseAmount: Number(detail.baseAmount),
        taxAmount: Number(detail.taxAmount),
        totalAmount: Number(detail.totalAmount),
        description: detail.lineDescription,
      })) || [],
      attachedFiles: journal.journalAttachments?.map((file: any) => ({
        id: file.attachmentId,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileSize: Number(file.fileSize),
        contentType: file.mimeType,
      })) || [],
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
