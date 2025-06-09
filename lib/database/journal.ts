import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  JournalHeader,
  JournalHeaderInsert,
  JournalHeaderUpdate,
  JournalDetail,
  JournalDetailInsert,
  JournalDetailUpdate,
  JournalWithDetails,
  JournalFilter,
  PaginatedResult,
  GenerateJournalNumberArgs,
  GenerateJournalNumberReturn
} from "./";
import { SupabaseQueryBuilder } from "./query-builder";

/**
 * 仕訳データ操作
 */
export class JournalService {
  /**
   * 全仕訳を取得（明細含む）
   */
  static async getJournals(filter: JournalFilter = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<JournalWithDetails>> {
    return SupabaseQueryBuilder.getJournals(filter, pagination);
  }

  /**
   * 仕訳番号で単一仕訳を取得（明細含む）
   */
  static async getJournalByNumber(journalNumber: string): Promise<JournalWithDetails | null> {
    return SupabaseQueryBuilder.getJournalById(journalNumber);
  }

  /**
   * 新しい仕訳を作成
   * ヘッダと明細をトランザクションで処理
   */
  static async createJournal(
    journalHeader: JournalHeaderInsert,
    journalDetails: JournalDetailInsert[]
  ): Promise<JournalWithDetails> {
    const supabase = await createServerSupabaseClient();

    const { data: headerData, error: headerError } = await supabase
      .from('journal_headers')
      .insert(journalHeader)
      .select()
      .single();

    if (headerError) {
      throw new Error(`仕訳ヘッダの作成に失敗しました: ${headerError.message}`);
    }

    // 明細データに仕訳番号を追加
    const detailsToInsert = journalDetails.map((detail) => ({
      ...detail,
      journal_number: headerData.journal_number,
    }));

    const { data: detailsData, error: detailsError } = await supabase
      .from('journal_details')
      .insert(detailsToInsert)
      .select();

    if (detailsError) {
      // ヘッダ作成後の明細挿入失敗時はヘッダをロールバック
      await supabase.from('journal_headers').delete().eq('journal_number', headerData.journal_number);
      throw new Error(`仕訳明細の作成に失敗しました: ${detailsError.message}`);
    }
    
    // 結合されたオブジェクトを返す
    return { ...headerData, details: detailsData || [] };
  }

  /**
   * 既存仕訳を更新
   * ヘッダと明細をトランザクションで処理
   */
  static async updateJournal(
    journalNumber: string,
    journalHeaderUpdates: JournalHeaderUpdate,
    journalDetailsUpdates: JournalDetailInsert[]
  ): Promise<JournalWithDetails> {
    const supabase = await createServerSupabaseClient();

    // ヘッダを更新
    const { data: headerData, error: headerError } = await supabase
      .from('journal_headers')
      .update(journalHeaderUpdates)
      .eq('journal_number', journalNumber)
      .select()
      .single();

    if (headerError) {
      throw new Error(`仕訳ヘッダの更新に失敗しました: ${headerError.message}`);
    }

    // 既存明細を削除
    const { error: deleteError } = await supabase
      .from('journal_details')
      .delete()
      .eq('journal_number', journalNumber);

    if (deleteError) {
      throw new Error(`既存仕訳明細の削除に失敗しました: ${deleteError.message}`);
    }

    // 新しい明細を挿入
    const detailsToInsert = journalDetailsUpdates.map((detail) => ({
      ...detail,
      journal_number: journalNumber,
    }));

    const { data: detailsData, error: insertError } = await supabase
      .from('journal_details')
      .insert(detailsToInsert)
      .select();

    if (insertError) {
      // 必要に応じてロールバックロジックを追加
      throw new Error(`新規仕訳明細の挿入に失敗しました: ${insertError.message}`);
    }

    return { ...headerData, details: detailsData || [] };
  }

  /**
   * 仕訳を削除
   */
  static async deleteJournal(journalNumber: string): Promise<void> {
    const supabase = await createServerSupabaseClient();

    // 明細から削除
    const { error: detailError } = await supabase
      .from('journal_details')
      .delete()
      .eq('journal_number', journalNumber);

    if (detailError) {
      throw new Error(`仕訳明細の削除に失敗しました: ${detailError.message}`);
    }

    // ヘッダから削除
    const { error: headerError } = await supabase
      .from('journal_headers')
      .delete()
      .eq('journal_number', journalNumber);

    if (headerError) {
      throw new Error(`仕訳ヘッダの削除に失敗しました: ${headerError.message}`);
    }
  }

  /**
   * 仕訳番号を生成
   */
  static async generateJournalNumber(args: GenerateJournalNumberArgs): Promise<GenerateJournalNumberReturn> {
    return SupabaseQueryBuilder.generateJournalNumber(args.journal_date);
  }
}


interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
} 