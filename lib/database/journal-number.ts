import { prisma } from "./prisma";

// 簡単な型定義
type JournalNumberSequence = {
  journalDate: string;
  currentSequence: number;
  nextSequence: number;
};

/**
 * 仕訳番号管理サービス
 * YYYYMMDDxxxxxxx形式の仕訳番号生成・管理を行う
 */
export class JournalNumberService {
  /**
   * 指定日付の次の仕訳番号を生成する
   * @param date 仕訳日付（YYYY-MM-DD形式）
   * @returns Promise<{ success: boolean, data?: string, error?: string }>
   */
  static async generateNextJournalNumber(date: string): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    try {
      // 日付をYYYYMMDD形式に変換
      const datePrefix = date.replace(/-/g, "");

      // 現在の最大シーケンス番号を取得
      const lastSequence = await prisma.$queryRaw<
        [{ max_sequence: number | null }]
      >`
        SELECT COALESCE(MAX(CAST(SUBSTRING("journalNumber" FROM LENGTH("journalNumber") - 5) AS INTEGER)), 0) as max_sequence
        FROM journal_headers 
        WHERE "journalNumber" LIKE ${datePrefix + "%"}
      `;

      const nextSequence = (lastSequence[0]?.max_sequence || 0) + 1;
      const journalNumber = datePrefix +
        nextSequence.toString().padStart(6, "0");

      return {
        success: true,
        data: journalNumber,
      };
    } catch (error) {
      console.error("仕訳番号生成サービスエラー:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "不明なエラー",
      };
    }
  }

  /**
   * リトライ機能付きの安全な仕訳番号生成
   * @param date 仕訳日付（YYYY-MM-DD形式）
   * @param maxRetries 最大リトライ回数（デフォルト：3）
   * @returns Promise<{ success: boolean, data?: string, error?: string }>
   */
  static async generateNextJournalNumberSafe(
    date: string,
    maxRetries: number = 3
  ): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.generateNextJournalNumber(date);
        if (result.success) {
          return result;
        }
        
        // 失敗時は短時間待機してリトライ
        if (attempt < maxRetries) {
          await new Promise(resolve => 
            setTimeout(resolve, 50 * attempt) // 50ms, 100ms, 150ms
          );
        }
      } catch (error) {
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "不明なエラー",
          };
        }
        
        // 短時間待機してリトライ
        await new Promise(resolve => 
          setTimeout(resolve, 50 * attempt)
        );
      }
    }

    return {
      success: false,
      error: `仕訳番号生成に${maxRetries}回失敗しました`,
    };
  }
}

/**
 * 仕訳番号生成関数（互換性のため）
 * @param journalDate 仕訳日付
 * @returns 生成された仕訳番号
 */
export async function generateJournalNumber(
  journalDate: string | Date
): Promise<string> {
  const dateStr = journalDate instanceof Date
    ? `${journalDate.getFullYear()}-${String(journalDate.getMonth() + 1).padStart(2, '0')}-${String(journalDate.getDate()).padStart(2, '0')}`
    : journalDate;

  const result = await JournalNumberService.generateNextJournalNumberSafe(dateStr);
  
  if (!result.success || !result.data) {
    throw new Error(`仕訳番号の生成に失敗しました: ${result.error}`);
  }

  return result.data;
}