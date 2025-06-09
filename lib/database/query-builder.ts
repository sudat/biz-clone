import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { 
  AccountFilter, 
  PartnerFilter, 
  JournalFilter, 
  PaginationParams,
  PaginatedResult 
} from "./helpers";
import type { Account, Partner, JournalHeader, JournalDetail } from "./types";

/**
 * 型安全なクエリビルダークラス
 */
export class SupabaseQueryBuilder {
  constructor() {}

  /**
   * 勘定科目の検索・フィルタリング
   */
  static async getAccounts(
    filter: AccountFilter = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<Account>> {
    const supabase = await createServerSupabaseClient();
    const { page = 1, per_page = 50, sort_by = 'account_code', sort_order = 'asc' } = pagination;
    const { account_type, is_active, search, parent_only } = filter;

    let query = supabase
      .from('accounts')
      .select('*', { count: 'exact' });

    // フィルタリング
    if (account_type) {
      query = query.eq('account_type', account_type);
    }
    
    if (typeof is_active === 'boolean') {
      query = query.eq('is_active', is_active);
    }

    if (parent_only) {
      query = query.is('parent_account_code', null);
    }

    if (search) {
      query = query.or(`account_code.ilike.%${search}%,account_name.ilike.%${search}%`);
    }

    // ソート
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // ページネーション
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`勘定科目の取得に失敗しました: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
  }

  /**
   * 取引先の検索・フィルタリング
   */
  static async getPartners(
    filter: PartnerFilter = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<Partner>> {
    const supabase = await createServerSupabaseClient();
    const { page = 1, per_page = 50, sort_by = 'partner_code', sort_order = 'asc' } = pagination;
    const { partner_type, is_active, search } = filter;

    let query = supabase
      .from('partners')
      .select('*', { count: 'exact' });

    // フィルタリング
    if (partner_type) {
      query = query.eq('partner_type', partner_type);
    }
    
    if (typeof is_active === 'boolean') {
      query = query.eq('is_active', is_active);
    }

    if (search) {
      query = query.or(`partner_code.ilike.%${search}%,partner_name.ilike.%${search}%,partner_kana.ilike.%${search}%`);
    }

    // ソート
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // ページネーション
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`取引先の取得に失敗しました: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
  }

  /**
   * 仕訳の検索・フィルタリング（明細含む）
   */
  static async getJournals(
    filter: JournalFilter = {},
    pagination: PaginationParams = {}
  ) {
    const supabase = await createServerSupabaseClient();
    const { page = 1, per_page = 20, sort_by = 'journal_date', sort_order = 'desc' } = pagination;
    const { date_from, date_to, account_code, partner_code, search } = filter;

    let query = supabase
      .from('journal_headers')
      .select(`
        *,
        details:journal_details(
          *,
          account:accounts(account_name, account_type),
          sub_account:sub_accounts(sub_account_name),
          partner:partners(partner_name),
          analysis_code:analysis_codes(analysis_name)
        )
      `, { count: 'exact' });

    // フィルタリング
    if (date_from) {
      query = query.gte('journal_date', date_from);
    }
    
    if (date_to) {
      query = query.lte('journal_date', date_to);
    }

    if (search) {
      query = query.or(`journal_number.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // ソート
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // ページネーション
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`仕訳の取得に失敗しました: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
  }

  /**
   * 単一仕訳の取得（明細含む）
   */
  static async getJournalById(journalNumber: string) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('journal_headers')
      .select(`
        *,
        details:journal_details(
          *,
          account:accounts(account_name, account_type),
          sub_account:sub_accounts(sub_account_name),
          partner:partners(partner_name),
          analysis_code:analysis_codes(analysis_name)
        )
      `)
      .eq('journal_number', journalNumber)
      .single();

    if (error) {
      throw new Error(`仕訳の取得に失敗しました: ${error.message}`);
    }

    return data;
  }

  /**
   * 仕訳番号の自動生成
   */
  static async generateJournalNumber(journalDate: string): Promise<string> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .rpc('generate_journal_number', { journal_date: journalDate });

    if (error) {
      throw new Error(`仕訳番号の生成に失敗しました: ${error.message}`);
    }

    return data;
  }
} 