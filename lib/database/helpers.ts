import type { 
  Database, 
  Account, 
  SubAccount, 
  Partner, 
  AnalysisCode,
  JournalHeader,
  JournalDetail,
  UserRole 
} from "./types";

/**
 * Supabaseクエリ用ヘルパー型
 */
export type Tables = Database['public']['Tables'];
export type Functions = Database['public']['Functions'];

// テーブル別の型定義エイリアス
export type AccountTable = Tables['accounts'];
export type SubAccountTable = Tables['sub_accounts'];
export type PartnerTable = Tables['partners'];
export type AnalysisCodeTable = Tables['analysis_codes'];
export type JournalHeaderTable = Tables['journal_headers'];
export type JournalDetailTable = Tables['journal_details'];
export type UserRoleTable = Tables['user_roles'];

/**
 * クエリ結果型（Selectクエリの戻り値型）
 */
export type QueryResult<T extends keyof Tables> = Tables[T]['Row'];
export type QueryInsert<T extends keyof Tables> = Tables[T]['Insert'];
export type QueryUpdate<T extends keyof Tables> = Tables[T]['Update'];

/**
 * 関数の引数と戻り値型
 */
export type GenerateJournalNumberArgs = Functions['generate_journal_number']['Args'];
export type GenerateJournalNumberReturn = Functions['generate_journal_number']['Returns'];

/**
 * カスタムクエリ型（複数テーブル結合用）
 */
export type JournalWithDetails = JournalHeader & {
  details: Array<JournalDetail & {
    account?: Pick<Account, 'account_name' | 'account_type'>;
    sub_account?: Pick<SubAccount, 'sub_account_name'>;
    partner?: Pick<Partner, 'partner_name'>;
    analysis_code?: Pick<AnalysisCode, 'analysis_name'>;
  }>;
};

export type AccountWithSubAccounts = Account & {
  sub_accounts: SubAccount[];
};

/**
 * フィルター型
 */
export type AccountFilter = {
  account_type?: Account['account_type'];
  is_active?: boolean;
  search?: string;
  parent_only?: boolean;
};

export type PartnerFilter = {
  partner_type?: Partner['partner_type'];
  is_active?: boolean;
  search?: string;
};

export type JournalFilter = {
  date_from?: string;
  date_to?: string;
  account_code?: string;
  partner_code?: string;
  search?: string;
};

/**
 * ページネーション型
 */
export type PaginationParams = {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

/**
 * API レスポンス型
 */
export type ApiResponse<T = any> = {
  data?: T;
  error?: string;
  message?: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: any;
};

/**
 * 型ガード関数
 */
export const isAccount = (obj: any): obj is Account => {
  return obj && typeof obj.account_code === 'string' && typeof obj.account_name === 'string';
};

export const isJournalHeader = (obj: any): obj is JournalHeader => {
  return obj && typeof obj.journal_number === 'string' && typeof obj.journal_date === 'string';
};

/**
 * バリデーション用型（Zodスキーマで使用）
 */
export type CreateAccountSchema = Pick<Account, 'account_code' | 'account_name' | 'account_type'> & {
  parent_account_code?: string;
  is_detail?: boolean;
};

export type CreateJournalSchema = {
  journal_date: string;
  description?: string;
  details: Array<{
    debit_credit: 'D' | 'C';
    account_code: string;
    sub_account_code?: string;
    partner_code?: string;
    analysis_code?: string;
    amount: number;
    line_description?: string;
  }>;
}; 