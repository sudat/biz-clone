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

// 仕訳明細データ型
export interface JournalDetailData {
  debitCredit: "debit" | "credit";
  accountCode: string;
  accountName?: string;
  subAccountCode?: string;
  subAccountName?: string;
  partnerCode?: string;
  partnerName?: string;
  analysisCode?: string;
  analysisCodeName?: string;
  amount: number;
  description?: string;
}

// 仕訳保存データ型
export interface JournalSaveData {
  header: {
    journalDate: Date;
    description?: string;
  };
  details: JournalDetailData[];
}

// 仕訳保存結果型
export interface JournalSaveResult {
  success: boolean;
  journalNumber?: string;
  error?: string;
}

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

    // 仕訳番号生成（計上日ベース）
    const journalNumber = await generateJournalNumber(data.header.journalDate);

    // データベーストランザクション内で仕訳保存
    const result = await prisma.$transaction(async (tx) => {
      // 仕訳ヘッダー作成
      const journalEntry = await tx.journalEntry.create({
        data: {
          journalNumber,
          journalDate: data.header.journalDate,
          description: data.header.description || "",
          status: "draft",
        },
      });

      // 仕訳明細作成
      const journalDetails = await Promise.all(
        data.details.map(async (detail, index) => {
          return tx.journalDetail.create({
            data: {
              journalEntryId: journalEntry.id,
              lineNumber: index + 1,
              debitCredit: detail.debitCredit,
              accountCode: detail.accountCode,
              subAccountCode: detail.subAccountCode || null,
              partnerCode: detail.partnerCode || null,
              analysisCode: detail.analysisCode || null,
              amount: new Prisma.Decimal(detail.amount),
              description: detail.description || null,
            },
          });
        }),
      );

      return {
        journalEntry,
        journalDetails,
      };
    });

    // キャッシュ更新
    revalidatePath("/siwake");
    revalidatePath("/siwake/new");

    return {
      success: true,
      journalNumber: result.journalEntry.journalNumber,
    };
  } catch (error) {
    console.error("仕訳保存エラー:", error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "予期しないエラーが発生しました",
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

    if (!detail.amount || detail.amount <= 0) {
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
    .reduce((sum, d) => sum + d.amount, 0);

  const creditTotal = data.details
    .filter((d) => d.debitCredit === "credit")
    .reduce((sum, d) => sum + d.amount, 0);

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
 * 仕訳削除処理
 */
export async function deleteJournal(
  journalNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      // 仕訳検索
      const journalEntry = await tx.journalEntry.findUnique({
        where: { journalNumber },
        include: { details: true },
      });

      if (!journalEntry) {
        throw new Error("指定された仕訳が見つかりません");
      }

      // 明細削除
      await tx.journalDetail.deleteMany({
        where: { journalEntryId: journalEntry.id },
      });

      // 仕訳削除
      await tx.journalEntry.delete({
        where: { id: journalEntry.id },
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
