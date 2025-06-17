/**
 * 仕訳照会用Server Actions
 * ============================================================================
 * 仕訳の取得・検索・削除処理
 * ============================================================================
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { toJST } from "@/lib/utils/date-utils";
import { deleteAllJournalAttachments, JournalAttachmentData } from "./journal-attachments";
// Journal inquiry specific types

// 仕訳照会用の詳細データ型
export interface JournalInquiryData {
  journalNumber: string;
  journalDate: Date;
  description: string | null;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;

  // ユーザ関連
  createdBy: string | null;
  createdUser: {
    userId: string;
    userCode: string;
    userName: string;
    userKana: string | null;
  } | null;

  // 承認フロー関連
  approvalStatus: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  approvedUser: {
    userId: string;
    userCode: string;
    userName: string;
    userKana: string | null;
  } | null;
  rejectedReason: string | null;

  details: JournalDetailInquiryData[];
  attachments?: JournalAttachmentData[];
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
  taxCode: string | null;
  lineDescription: string | null;
}

/**
 * 仕訳番号で単一仕訳を取得（関連データ含む）
 */
export async function getJournalByNumber(
  journalNumber: string,
): Promise<{ success: boolean; data?: JournalInquiryData; error?: string }> {
  try {
    const journal = await prisma.journalHeader.findUnique({
      where: { journalNumber },
      include: {
        createdUser: {
          select: {
            userId: true,
            userCode: true,
            userName: true,
            userKana: true,
          },
        },
        approvedUser: {
          select: {
            userId: true,
            userCode: true,
            userName: true,
            userKana: true,
          },
        },
        journalDetails: {
          include: {
            account: true,
            subAccount: true,
            partner: true,
            analysisCodeRel: true,
          },
          orderBy: { lineNumber: "asc" },
        },
        journalAttachments: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!journal) {
      return {
        success: false,
        error: "指定された仕訳が見つかりません",
      };
    }

    // Decimal型をnumber型に変換、日時を日本時間に変換
    const journalData: JournalInquiryData = {
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: toJST(journal.createdAt),
      updatedAt: toJST(journal.updatedAt),

      // ユーザ関連
      createdBy: journal.createdBy,
      createdUser: journal.createdUser,

      // 承認フロー関連
      approvalStatus: journal.approvalStatus,
      approvedBy: journal.approvedBy,
      approvedAt: journal.approvedAt ? toJST(journal.approvedAt) : null,
      approvedUser: journal.approvedUser,
      rejectedReason: journal.rejectedReason,

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
        taxCode: detail.taxCode || null,
        lineDescription: detail.lineDescription,
      })),

      // 添付ファイル情報
      attachments: journal.journalAttachments.map((attachment) => ({
        attachmentId: attachment.attachmentId,
        journalNumber: attachment.journalNumber,
        fileName: attachment.fileName,
        originalFileName: attachment.originalFileName,
        fileUrl: attachment.fileUrl,
        fileSize: Number(attachment.fileSize),
        fileExtension: attachment.fileExtension,
        mimeType: attachment.mimeType,
        uploadedAt: attachment.uploadedAt,
        createdAt: attachment.createdAt,
        updatedAt: attachment.updatedAt,
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
        { journalNumber: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.journalDate = {};
      if (dateFrom) {
        (where.journalDate as Record<string, unknown>).gte = dateFrom;
      }
      if (dateTo) (where.journalDate as Record<string, unknown>).lte = dateTo;
    }

    // データ取得
    const [journals, totalCount] = await Promise.all([
      prisma.journalHeader.findMany({
        where,
        include: {
          createdUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          approvedUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          journalDetails: {
            include: {
              account: true,
              subAccount: true,
              partner: true,
              analysisCodeRel: true,
            },
            orderBy: { lineNumber: "asc" },
          },
        },
        orderBy: { journalNumber: "desc" },
        skip,
        take: limit,
      }),
      prisma.journalHeader.count({ where }),
    ]);

    // データ変換（日時を日本時間に変換）
    const journalData: JournalInquiryData[] = journals.map((journal) => ({
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: toJST(journal.createdAt),
      updatedAt: toJST(journal.updatedAt),

      // ユーザ関連
      createdBy: journal.createdBy,
      createdUser: journal.createdUser,

      // 承認フロー関連
      approvalStatus: journal.approvalStatus,
      approvedBy: journal.approvedBy,
      approvedAt: journal.approvedAt ? toJST(journal.approvedAt) : null,
      approvedUser: journal.approvedUser,
      rejectedReason: journal.rejectedReason,

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
        taxCode: detail.taxCode || null,
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
  journalNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    let deletedFileUrls: string[] = [];

    await prisma.$transaction(async (tx) => {
      // 仕訳存在確認
      const journal = await tx.journalHeader.findUnique({
        where: { journalNumber },
      });

      if (!journal) {
        throw new Error("指定された仕訳が見つかりません");
      }

      // 添付ファイル削除（先に削除処理）
      const attachmentResult = await deleteAllJournalAttachments(journalNumber);
      if (attachmentResult.success && attachmentResult.deletedFiles) {
        deletedFileUrls = attachmentResult.deletedFiles;
      }

      // 明細削除
      await tx.journalDetail.deleteMany({
        where: { journalNumber },
      });

      // ヘッダー削除（Cascadeで添付ファイルも削除される）
      await tx.journalHeader.delete({
        where: { journalNumber },
      });
    });

    // TODO: UploadThingからファイルを削除する処理が必要
    // deletedFileUrls を使ってUploadThingのファイルを削除
    if (deletedFileUrls.length > 0) {
      console.log("削除対象ファイル:", deletedFileUrls);
      // ここでUploadThingのファイル削除APIを呼び出す
    }

    // キャッシュ更新
    revalidatePath("/siwake");

    return { success: true };
  } catch (error) {
    console.error("仕訳削除エラー:", error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "仕訳の削除に失敗しました",
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
      if (dateFrom) {
        (where.journalDate as Record<string, unknown>).gte = dateFrom;
      }
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
        distinct: ["journalNumber"],
      });
      journalNumbers = filteredDetails.map((d) => d.journalNumber);

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
        createdUser: {
          select: {
            userId: true,
            userCode: true,
            userName: true,
            userKana: true,
          },
        },
        approvedUser: {
          select: {
            userId: true,
            userCode: true,
            userName: true,
            userKana: true,
          },
        },
        journalDetails: {
          include: {
            account: true,
            subAccount: true,
            partner: true,
            analysisCodeRel: true,
          },
          orderBy: { lineNumber: "asc" },
        },
      },
      orderBy: [
        { journalDate: "asc" },
        { journalNumber: "asc" },
      ],
    });

    // データ変換（日時を日本時間に変換）
    const journalData: JournalInquiryData[] = journals.map((journal) => ({
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount?.toNumber() || 0,
      createdAt: toJST(journal.createdAt),
      updatedAt: toJST(journal.updatedAt),

      // ユーザ関連
      createdBy: journal.createdBy,
      createdUser: journal.createdUser,

      // 承認フロー関連
      approvalStatus: journal.approvalStatus,
      approvedBy: journal.approvedBy,
      approvedAt: journal.approvedAt ? toJST(journal.approvedAt) : null,
      approvedUser: journal.approvedUser,
      rejectedReason: journal.rejectedReason,

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
        baseAmount: detail.baseAmount?.toNumber() || 0,
        taxAmount: detail.taxAmount?.toNumber() || 0,
        totalAmount: detail.totalAmount?.toNumber() || 0,
        taxCode: detail.taxCode || null,
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

/**
 * 特定ユーザが作成した承認中の仕訳一覧を取得
 */
export async function getUserCreatedPendingJournals(params: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: JournalInquiryData[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const { userId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // 検索条件：作成者が指定ユーザで承認状況が承認中
    const where = {
      createdBy: userId,
      approvalStatus: "pending",
    };

    // データ取得
    const [journals, totalCount] = await Promise.all([
      prisma.journalHeader.findMany({
        where,
        include: {
          createdUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          approvedUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          journalDetails: {
            include: {
              account: true,
              subAccount: true,
              partner: true,
              analysisCodeRel: true,
            },
            orderBy: { lineNumber: "asc" },
          },
        },
        orderBy: { journalNumber: "desc" }, // 仕訳番号の降順
        skip,
        take: limit,
      }),
      prisma.journalHeader.count({ where }),
    ]);

    // データ変換（日時を日本時間に変換）
    const journalData: JournalInquiryData[] = journals.map((journal) => ({
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: toJST(journal.createdAt),
      updatedAt: toJST(journal.updatedAt),

      // ユーザ関連
      createdBy: journal.createdBy,
      createdUser: journal.createdUser,

      // 承認フロー関連
      approvalStatus: journal.approvalStatus,
      approvedBy: journal.approvedBy,
      approvedAt: journal.approvedAt ? toJST(journal.approvedAt) : null,
      approvedUser: journal.approvedUser,
      rejectedReason: journal.rejectedReason,

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
        taxCode: detail.taxCode || null,
        lineDescription: detail.lineDescription,
      })),
    }));

    return {
      success: true,
      data: journalData,
      totalCount,
    };
  } catch (error) {
    console.error("承認中仕訳一覧取得エラー:", error);
    return {
      success: false,
      error: "承認中仕訳一覧の取得に失敗しました",
    };
  }
}

/**
 * 仕訳承認処理
 */
export async function approveJournal(params: {
  journalNumber: string;
  approvedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let updatedJournal: any = null;
    
    await prisma.$transaction(async (tx) => {
      // 仕訳存在確認
      const journal = await tx.journalHeader.findUnique({
        where: { journalNumber: params.journalNumber },
      });

      if (!journal) {
        throw new Error("指定された仕訳が見つかりません");
      }

      if (journal.approvalStatus !== "pending") {
        throw new Error("承認中ではない仕訳は承認できません");
      }

      // 承認処理
      updatedJournal = await tx.journalHeader.update({
        where: { journalNumber: params.journalNumber },
        data: {
          approvalStatus: "approved",
          approvedBy: params.approvedBy,
          approvedAt: new Date(),
        },
      });
    });

    // 承認処理が正常に完了したかチェック
    if (!updatedJournal || updatedJournal.approvalStatus !== "approved") {
      throw new Error("承認処理が正常に完了しませんでした");
    }

    // キャッシュ更新（複数のパスを更新）
    revalidatePath("/workflow/approval-list");
    revalidatePath("/siwake");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("仕訳承認エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "仕訳の承認に失敗しました",
    };
  }
}

/**
 * 指定ユーザが承認すべき仕訳一覧を取得
 * ステップが1つ前の組織で起票された承認中の仕訳を取得
 */
export async function getApprovableJournals(params: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: JournalInquiryData[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const { userId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // ユーザが所属するワークフロー組織を取得
    const userOrganizations = await prisma.workflowOrganizationUser.findMany({
      where: {
        userId: userId,
        isActive: true,
      },
      include: {
        workflowOrganization: {
          select: {
            organizationCode: true,
            organizationName: true,
          },
        },
      },
    });

    if (userOrganizations.length === 0) {
      return { success: true, data: [], totalCount: 0 };
    }

    // ユーザが所属する組織のコード一覧
    const userOrgCodes = userOrganizations.map((uo) => uo.organizationCode);

    // ワークフロールートステップを取得して、承認対象となる組織を特定
    const workflowSteps = await prisma.workflowRouteStep.findMany({
      where: {
        organizationCode: { in: userOrgCodes },
      },
      include: {
        workflowRoute: {
          include: {
            workflowRouteSteps: {
              orderBy: { stepNumber: "asc" },
              include: {
                workflowOrganization: {
                  select: {
                    organizationCode: true,
                    organizationName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 承認対象となる組織（1つ前のステップの組織）を特定
    const approvableOrgCodes: string[] = [];

    for (const step of workflowSteps) {
      const currentStepNumber = step.stepNumber;
      const prevStepNumber = currentStepNumber - 1;

      // 1つ前のステップの組織を探す
      const prevStep = step.workflowRoute.workflowRouteSteps.find(
        (s) => s.stepNumber === prevStepNumber,
      );

      if (prevStep) {
        approvableOrgCodes.push(prevStep.organizationCode);
      }
    }

    if (approvableOrgCodes.length === 0) {
      return { success: true, data: [], totalCount: 0 };
    }

    // 承認対象の仕訳を取得するため、1つ前のステップの組織に所属するユーザを取得
    const approvableUsers = await prisma.workflowOrganizationUser.findMany({
      where: {
        organizationCode: { in: Array.from(new Set(approvableOrgCodes)) },
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    const approvableUserIds = approvableUsers.map((au) => au.userId);

    if (approvableUserIds.length === 0) {
      return { success: true, data: [], totalCount: 0 };
    }

    // 検索条件：1つ前のステップの組織のユーザが作成した承認中の仕訳
    const where = {
      createdBy: { in: approvableUserIds },
      approvalStatus: "pending",
    };

    console.log("承認対象仕訳検索条件:", {
      approvableUserIds,
      approvalStatus: "pending",
      whereCondition: where
    });

    // データ取得
    const [journals, totalCount] = await Promise.all([
      prisma.journalHeader.findMany({
        where,
        include: {
          createdUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          approvedUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          journalDetails: {
            include: {
              account: true,
              subAccount: true,
              partner: true,
              analysisCodeRel: true,
            },
            orderBy: [
              { lineNumber: "asc" },
            ],
          },
        },
        orderBy: { journalNumber: "desc" },
        skip,
        take: limit,
      }),
      prisma.journalHeader.count({ where }),
    ]);

    // データ変換（日時を日本時間に変換）
    const journalData: JournalInquiryData[] = journals.map((journal) => ({
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: toJST(journal.createdAt),
      updatedAt: toJST(journal.updatedAt),

      // ユーザ関連
      createdBy: journal.createdBy,
      createdUser: journal.createdUser,

      // 承認フロー関連
      approvalStatus: journal.approvalStatus,
      approvedBy: journal.approvedBy,
      approvedAt: journal.approvedAt ? toJST(journal.approvedAt) : null,
      approvedUser: journal.approvedUser,
      rejectedReason: journal.rejectedReason,

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
        taxCode: detail.taxCode || null,
        lineDescription: detail.lineDescription,
      })),
    }));

    return { success: true, data: journalData, totalCount };
  } catch (error) {
    console.error("承認対象仕訳取得エラー:", error);
    return {
      success: false,
      error: "承認対象仕訳の取得に失敗しました",
    };
  }
}

/**
 * 指定ユーザが承認した承認済仕訳一覧を取得
 */
export async function getApprovedJournalsByUser(params: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: JournalInquiryData[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const { userId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // 検索条件：承認済で、承認者が指定ユーザ
    const where = {
      approvalStatus: "approved",
      approvedBy: userId,
    };

    // データ取得
    const [journals, totalCount] = await Promise.all([
      prisma.journalHeader.findMany({
        where,
        include: {
          createdUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          approvedUser: {
            select: {
              userId: true,
              userCode: true,
              userName: true,
              userKana: true,
            },
          },
          journalDetails: {
            include: {
              account: true,
              subAccount: true,
              partner: true,
              analysisCodeRel: true,
            },
            orderBy: { lineNumber: "asc" },
          },
        },
        orderBy: { journalNumber: "desc" }, // 仕訳番号の降順
        skip,
        take: limit,
      }),
      prisma.journalHeader.count({ where }),
    ]);

    // データ変換（日時を日本時間に変換）
    const journalData: JournalInquiryData[] = journals.map((journal) => ({
      journalNumber: journal.journalNumber,
      journalDate: journal.journalDate,
      description: journal.description,
      totalAmount: journal.totalAmount.toNumber(),
      createdAt: toJST(journal.createdAt),
      updatedAt: toJST(journal.updatedAt),

      // ユーザ関連
      createdBy: journal.createdBy,
      createdUser: journal.createdUser,

      // 承認フロー関連
      approvalStatus: journal.approvalStatus,
      approvedBy: journal.approvedBy,
      approvedAt: journal.approvedAt ? toJST(journal.approvedAt) : null,
      approvedUser: journal.approvedUser,
      rejectedReason: journal.rejectedReason,

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
        taxCode: detail.taxCode || null,
        lineDescription: detail.lineDescription,
      })),
    }));

    return {
      success: true,
      data: journalData,
      totalCount,
    };
  } catch (error) {
    console.error("承認済仕訳一覧取得エラー:", error);
    return {
      success: false,
      error: "承認済仕訳一覧の取得に失敗しました",
    };
  }
}
