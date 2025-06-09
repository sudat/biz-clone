import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { JournalNumberSequence } from "./types";

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
      const supabase = await createServerSupabaseClient();

      // PostgreSQL関数を呼び出して仕訳番号を生成
      const { data: journalNumber, error } = await supabase.rpc(
        'get_next_journal_number',
        { target_date: date }
      );

      if (error) {
        console.error('仕訳番号生成エラー:', error);
        return {
          success: false,
          error: `仕訳番号の生成に失敗しました: ${error.message}`,
        };
      }

      if (!journalNumber) {
        return {
          success: false,
          error: '仕訳番号が生成されませんでした',
        };
      }

      return {
        success: true,
        data: journalNumber,
      };
    } catch (error) {
      console.error('仕訳番号生成サービスエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 指定の仕訳番号が既に使用されているかチェックする
   * @param journalNumber チェックする仕訳番号
   * @returns Promise<{ success: boolean, data?: boolean, error?: string }>
   */
  static async checkJournalNumberExists(journalNumber: string): Promise<{
    success: boolean;
    data?: boolean;
    error?: string;
  }> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data: exists, error } = await supabase.rpc(
        'check_journal_number_exists',
        { journal_number_to_check: journalNumber }
      );

      if (error) {
        console.error('仕訳番号存在チェックエラー:', error);
        return {
          success: false,
          error: `仕訳番号の存在チェックに失敗しました: ${error.message}`,
        };
      }

      return {
        success: true,
        data: exists,
      };
    } catch (error) {
      console.error('仕訳番号存在チェックサービスエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 指定日付の最後の仕訳番号を取得する
   * @param date 取得対象日付（YYYY-MM-DD形式）
   * @returns Promise<{ success: boolean, data?: string | null, error?: string }>
   */
  static async getLastJournalNumberForDate(date: string): Promise<{
    success: boolean;
    data?: string | null;
    error?: string;
  }> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data: lastNumber, error } = await supabase.rpc(
        'get_last_journal_number_for_date',
        { target_date: date }
      );

      if (error) {
        console.error('最終仕訳番号取得エラー:', error);
        return {
          success: false,
          error: `最終仕訳番号の取得に失敗しました: ${error.message}`,
        };
      }

      return {
        success: true,
        data: lastNumber,
      };
    } catch (error) {
      console.error('最終仕訳番号取得サービスエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 指定日付の仕訳番号シーケンス情報を取得する
   * @param date 取得対象日付（YYYY-MM-DD形式）
   * @returns Promise<{ success: boolean, data?: JournalNumberSequence | null, error?: string }>
   */
  static async getJournalNumberSequence(date: string): Promise<{
    success: boolean;
    data?: JournalNumberSequence | null;
    error?: string;
  }> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('journal_number_sequences')
        .select('*')
        .eq('journal_date', date)
        .maybeSingle();

      if (error) {
        console.error('仕訳番号シーケンス取得エラー:', error);
        return {
          success: false,
          error: `仕訳番号シーケンスの取得に失敗しました: ${error.message}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('仕訳番号シーケンス取得サービスエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 指定日付の仕訳番号プレビューを生成する（実際には番号を発行しない）
   * @param date 仕訳日付（YYYY-MM-DD形式）
   * @returns Promise<{ success: boolean, data?: string, error?: string }>
   */
  static async previewNextJournalNumber(date: string): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    try {
      // 現在のシーケンス情報を取得
      const sequenceResult = await this.getJournalNumberSequence(date);
      
      if (!sequenceResult.success) {
        return {
          success: false,
          error: sequenceResult.error,
        };
      }

      // 日付をYYYYMMDD形式に変換
      const datePrefix = date.replace(/-/g, '');
      
      // 次の番号を計算（実際には発行しない）
      const nextSequence = sequenceResult.data 
        ? sequenceResult.data.last_sequence_number + 1 
        : 1;
      
      const previewNumber = datePrefix + nextSequence.toString().padStart(7, '0');

      return {
        success: true,
        data: previewNumber,
      };
    } catch (error) {
      console.error('仕訳番号プレビューエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 安全な仕訳番号生成（リトライ機能付き）
   * @param date 仕訳日付（YYYY-MM-DD形式）
   * @param maxRetries 最大リトライ回数（デフォルト: 3）
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
    try {
      const supabase = await createServerSupabaseClient();

      const { data: journalNumber, error } = await supabase.rpc(
        'get_next_journal_number_safe',
        { target_date: date, max_retries: maxRetries }
      );

      if (error) {
        console.error('安全な仕訳番号生成エラー:', error);
        return {
          success: false,
          error: `安全な仕訳番号の生成に失敗しました: ${error.message}`,
        };
      }

      if (!journalNumber) {
        return {
          success: false,
          error: '安全な仕訳番号が生成されませんでした',
        };
      }

      return {
        success: true,
        data: journalNumber,
      };
    } catch (error) {
      console.error('安全な仕訳番号生成サービスエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 複数の仕訳番号を一括生成する
   * @param date 仕訳日付（YYYY-MM-DD形式）
   * @param count 生成する仕訳番号の数
   * @returns Promise<{ success: boolean, data?: string[], error?: string }>
   */
  static async generateMultipleJournalNumbers(
    date: string, 
    count: number
  ): Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data: journalNumbers, error } = await supabase.rpc(
        'get_multiple_journal_numbers',
        { target_date: date, count }
      );

      if (error) {
        console.error('複数仕訳番号生成エラー:', error);
        return {
          success: false,
          error: `複数仕訳番号の生成に失敗しました: ${error.message}`,
        };
      }

      if (!journalNumbers || journalNumbers.length === 0) {
        return {
          success: false,
          error: '複数仕訳番号が生成されませんでした',
        };
      }

      return {
        success: true,
        data: journalNumbers,
      };
    } catch (error) {
      console.error('複数仕訳番号生成サービスエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 仕訳番号の整合性をチェックする
   * @param date 対象日付（未指定の場合は全日付をチェック）
   * @returns Promise<{ success: boolean, data?: any[], error?: string }>
   */
  static async validateJournalNumberIntegrity(date?: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data: integrityReport, error } = await supabase.rpc(
        'validate_journal_number_integrity',
        { target_date: date || null }
      );

      if (error) {
        console.error('仕訳番号整合性チェックエラー:', error);
        return {
          success: false,
          error: `仕訳番号整合性チェックに失敗しました: ${error.message}`,
        };
      }

      return {
        success: true,
        data: integrityReport || [],
      };
    } catch (error) {
      console.error('仕訳番号整合性チェックサービスエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }
} 