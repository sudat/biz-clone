/**
 * 仕訳保存Server Actions
 * ============================================================================
 * 仕訳の新規作成・更新・削除処理
 * ============================================================================
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/database/prisma";
import { generateJournalNumber } from "@/lib/database/journal-number";
import { convertToJapaneseDate } from "@/lib/utils/date-utils";
import { getCurrentUserIdFromCookie } from "@/lib/utils/auth-utils";
import { 
  JournalDetailData, 
  JournalSaveData, 
  JournalSaveResult 
} from "@/types/journal";
import { handleServerActionError, createValidationError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";


/**
 * 仕訳保存処理
 */
export async function saveJournal(
  data: JournalSaveData,
): Promise<JournalSaveResult> {
  try {
    // バリデーション
    const validationResult = validateJournalData(data);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    // 現在のユーザIDを取得（Cookieから）
    const currentUserId = await getCurrentUserIdFromCookie();

    // 仕訳番号生成（計上日ベース）
    const journalNumber = await generateJournalNumber(data.header.journalDate);

    // 明細の合計金額を計算（借方合計を使用）
    const totalAmount = data.details
      .filter((d) => d.debitCredit === "debit")
      .reduce((sum, d) => sum + d.totalAmount, 0);

    // データベーストランザクション内で仕訳保存
    const result = await prisma.$transaction(async (tx) => {
      // 日付を日本時間で保存するための変換
      const journalDateJST = convertToJapaneseDate(data.header.journalDate);

      // 仕訳ヘッダー作成（ユーザ情報と承認ステータスを含む）
      const journalHeader = await tx.journalHeader.create({
        data: {
          journalNumber,
          journalDate: journalDateJST,
          description: data.header.description || "",
          totalAmount: totalAmount,
          createdBy: currentUserId,
          approvalStatus: "pending", // 承認中ステータス
        },
      });

      // 仕訳明細作成
      const journalDetails = await Promise.all(
        data.details.map(async (detail, index) => {
          return tx.journalDetail.create({
            data: {
              journalNumber,
              lineNumber: index + 1,
              debitCredit: detail.debitCredit === "debit" ? "D" : "C",
              accountCode: detail.accountCode,
              subAccountCode: detail.subAccountCode || null,
              partnerCode: detail.partnerCode || null,
              analysisCode: detail.analysisCode || null,
              baseAmount: detail.baseAmount,
              taxAmount: detail.taxAmount,
              totalAmount: detail.totalAmount,
              taxCode: detail.taxCode || null,
              lineDescription: detail.description || null,
            },
          });
        }),
      );

      // 添付ファイル保存
      const journalAttachments = data.attachedFiles ? await Promise.all(
        data.attachedFiles.map(async (file) => {
          const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
          return tx.journalAttachment.create({
            data: {
              journalNumber,
              fileName: file.name,
              originalFileName: file.name,
              fileUrl: file.url,
              fileSize: BigInt(file.size),
              fileExtension,
              mimeType: file.type,
            },
          });
        })
      ) : [];

      return {
        journalHeader,
        journalDetails,
        journalAttachments,
      };
    });

    // キャッシュ更新
    revalidatePath("/siwake");
    revalidatePath("/siwake/new");

    return {
      success: true,
      journalNumber: result.journalHeader.journalNumber,
    };
  } catch (error) {
    console.error("仕訳保存エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "仕訳の保存に失敗しました",
    };
  }
}

/**
 * 仕訳データバリデーション
 */
function validateJournalData(
  data: JournalSaveData,
): { isValid: boolean; error?: string } {
  // ヘッダーチェック
  if (!data.header.journalDate) {
    return { isValid: false, error: "計上日は必須です" };
  }

  if (!data.details || data.details.length === 0) {
    return { isValid: false, error: "明細が入力されていません" };
  }

  if (data.details.length < 2) {
    return { isValid: false, error: "明細は2行以上必要です" };
  }

  // 明細チェック
  for (const [index, detail] of data.details.entries()) {
    const lineNum = index + 1;

    if (!detail.accountCode) {
      return { isValid: false, error: `${lineNum}行目: 勘定科目は必須です` };
    }

    if (!detail.totalAmount || detail.totalAmount <= 0) {
      return {
        isValid: false,
        error: `${lineNum}行目: 金額は1円以上で入力してください`,
      };
    }

    if (!["debit", "credit"].includes(detail.debitCredit)) {
      return {
        isValid: false,
        error: `${lineNum}行目: 借方・貸方の指定が不正です`,
      };
    }
  }

  // 借方・貸方バランスチェック
  const debitTotal = data.details
    .filter((d) => d.debitCredit === "debit")
    .reduce((sum, d) => sum + d.totalAmount, 0);

  const creditTotal = data.details
    .filter((d) => d.debitCredit === "credit")
    .reduce((sum, d) => sum + d.totalAmount, 0);

  if (Math.abs(debitTotal - creditTotal) >= 0.01) {
    return {
      isValid: false,
      error:
        `借方・貸方の合計が一致していません (借方: ¥${debitTotal.toLocaleString()}, 貸方: ¥${creditTotal.toLocaleString()})`,
    };
  }

  // 借方・貸方の両方が存在することをチェック
  const hasDebit = data.details.some((d) => d.debitCredit === "debit");
  const hasCredit = data.details.some((d) => d.debitCredit === "credit");

  if (!hasDebit) {
    return { isValid: false, error: "借方の明細が入力されていません" };
  }

  if (!hasCredit) {
    return { isValid: false, error: "貸方の明細が入力されていません" };
  }

  return { isValid: true };
}

/**
 * 仕訳更新処理
 */
export async function updateJournal(
  journalNumber: string,
  data: JournalSaveData,
): Promise<JournalSaveResult> {
  try {
    // バリデーション
    const validationResult = validateJournalData(data);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    // 現在のユーザIDを取得（Cookieから）
    const currentUserId = await getCurrentUserIdFromCookie();

    // 明細の合計金額を計算（借方合計を使用）
    const totalAmount = data.details
      .filter((d) => d.debitCredit === "debit")
      .reduce((sum, d) => sum + d.totalAmount, 0);

    // データベーストランザクション内で仕訳更新
    const result = await prisma.$transaction(async (tx) => {
      // 既存仕訳の存在確認
      const existingJournal = await tx.journalHeader.findUnique({
        where: { journalNumber },
        include: { journalDetails: true },
      });

      if (!existingJournal) {
        throw new Error("更新対象の仕訳が見つかりません");
      }

      // 既存明細をすべて削除
      await tx.journalDetail.deleteMany({
        where: { journalNumber },
      });

      // 日付を日本時間で保存するための変換
      const journalDateJST = convertToJapaneseDate(data.header.journalDate);

      // 仕訳ヘッダー更新（作成者と承認ステータスを上書き）
      const journalHeader = await tx.journalHeader.update({
        where: { journalNumber },
        data: {
          journalDate: journalDateJST,
          description: data.header.description || "",
          totalAmount: totalAmount,
          createdBy: currentUserId,           // 更新者を新しい作成者として設定
          approvalStatus: "pending",         // 承認ステータスを承認中にリセット
          approvedBy: null,                  // 承認者をクリア
          approvedAt: null,                  // 承認日時をクリア
          rejectedReason: null,              // 却下理由をクリア
        },
      });

      // 新しい仕訳明細作成
      const journalDetails = await Promise.all(
        data.details.map(async (detail, index) => {
          return tx.journalDetail.create({
            data: {
              journalNumber,
              lineNumber: index + 1,
              debitCredit: detail.debitCredit === "debit" ? "D" : "C",
              accountCode: detail.accountCode,
              subAccountCode: detail.subAccountCode || null,
              partnerCode: detail.partnerCode || null,
              analysisCode: detail.analysisCode || null,
              baseAmount: detail.baseAmount,
              taxAmount: detail.taxAmount,
              totalAmount: detail.totalAmount,
              taxCode: detail.taxCode || null,
              lineDescription: detail.description || null,
            },
          });
        }),
      );

      return {
        journalHeader,
        journalDetails,
      };
    });

    // キャッシュ更新
    revalidatePath("/siwake");
    revalidatePath(`/siwake/${journalNumber}`);
    revalidatePath(`/siwake/update/${journalNumber}`);

    return {
      success: true,
      journalNumber: result.journalHeader.journalNumber,
    };
  } catch (error) {
    console.error("仕訳更新エラー:", error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "予期しないエラーが発生しました",
    };
  }
}

/**
 * 仕訳削除処理
 */
export async function deleteJournal(
  journalNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      // 仕訳検索
      const journalHeader = await tx.journalHeader.findUnique({
        where: { journalNumber },
        include: { journalDetails: true },
      });

      if (!journalHeader) {
        throw new Error("指定された仕訳が見つかりません");
      }

      // 明細削除
      await tx.journalDetail.deleteMany({
        where: { journalNumber },
      });

      // 仕訳削除
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
      error: error instanceof Error
        ? error.message
        : "予期しないエラーが発生しました",
    };
  }
}
