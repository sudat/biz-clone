// ============================================================================
// Database TypeScript 型定義 (サブタスク 2.6)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: '資産' | '負債' | '資本' | '収益' | '費用'
          parent_account_code: string | null
          is_detail: boolean
          is_active: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: '資産' | '負債' | '資本' | '収益' | '費用'
          parent_account_code?: string | null
          is_detail?: boolean
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: '資産' | '負債' | '資本' | '収益' | '費用'
          parent_account_code?: string | null
          is_detail?: boolean
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      sub_accounts: {
        Row: {
          sub_account_code: string
          account_code: string
          sub_account_name: string
          is_active: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          sub_account_code: string
          account_code: string
          sub_account_name: string
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sub_account_code?: string
          account_code?: string
          sub_account_name?: string
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      partners: {
        Row: {
          partner_code: string
          partner_name: string
          partner_kana: string | null
          partner_type: '得意先' | '仕入先' | '金融機関' | 'その他'
          postal_code: string | null
          address: string | null
          phone: string | null
          email: string | null
          contact_person: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          partner_code: string
          partner_name: string
          partner_kana?: string | null
          partner_type: '得意先' | '仕入先' | '金融機関' | 'その他'
          postal_code?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          partner_code?: string
          partner_name?: string
          partner_kana?: string | null
          partner_type?: '得意先' | '仕入先' | '金融機関' | 'その他'
          postal_code?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      analysis_codes: {
        Row: {
          analysis_code: string
          analysis_name: string
          analysis_type: string
          parent_analysis_code: string | null
          is_active: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          analysis_code: string
          analysis_name: string
          analysis_type: string
          parent_analysis_code?: string | null
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          analysis_code?: string
          analysis_name?: string
          analysis_type?: string
          parent_analysis_code?: string | null
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      journal_headers: {
        Row: {
          journal_number: string
          journal_date: string
          description: string | null
          total_amount: number
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          journal_number: string
          journal_date: string
          description?: string | null
          total_amount?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          journal_number?: string
          journal_date?: string
          description?: string | null
          total_amount?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      journal_details: {
        Row: {
          journal_number: string
          line_number: number
          debit_credit: 'D' | 'C'
          account_code: string
          sub_account_code: string | null
          partner_code: string | null
          analysis_code: string | null
          amount: number
          line_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          journal_number: string
          line_number: number
          debit_credit: 'D' | 'C'
          account_code: string
          sub_account_code?: string | null
          partner_code?: string | null
          analysis_code?: string | null
          amount: number
          line_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          journal_number?: string
          line_number?: number
          debit_credit?: 'D' | 'C'
          account_code?: string
          sub_account_code?: string | null
          partner_code?: string | null
          analysis_code?: string | null
          amount?: number
          line_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          user_role: 'admin' | 'manager' | 'user'
          department: string | null
          company_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          user_role?: 'admin' | 'manager' | 'user'
          department?: string | null
          company_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          user_role?: 'admin' | 'manager' | 'user'
          department?: string | null
          company_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      journal_number_sequences: {
        Row: {
          journal_date: string
          last_sequence_number: number
          created_at: string
          updated_at: string
        }
        Insert: {
          journal_date: string
          last_sequence_number?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          journal_date?: string
          last_sequence_number?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_journal_number: {
        Args: {
          journal_date: string
        }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_permission: {
        Args: {
          required_role: string
        }
        Returns: boolean
      }
      get_next_journal_number: {
        Args: {
          target_date: string
        }
        Returns: string
      }
      check_journal_number_exists: {
        Args: {
          journal_number_to_check: string
        }
        Returns: boolean
      }
      get_last_journal_number_for_date: {
        Args: {
          target_date: string
        }
        Returns: string
      }
      get_next_journal_number_safe: {
        Args: {
          target_date: string
          max_retries?: number
        }
        Returns: string
      }
      get_multiple_journal_numbers: {
        Args: {
          target_date: string
          count: number
        }
        Returns: string[]
      }
      validate_journal_number_integrity: {
        Args: {
          target_date?: string
        }
        Returns: {
          date_checked: string
          expected_count: number
          actual_count: number
          missing_numbers: string[]
          duplicate_numbers: string[]
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================================
// 便利な型エイリアス
// ============================================================================

export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type SubAccount = Database['public']['Tables']['sub_accounts']['Row']
export type SubAccountInsert = Database['public']['Tables']['sub_accounts']['Insert']
export type SubAccountUpdate = Database['public']['Tables']['sub_accounts']['Update']

export type Partner = Database['public']['Tables']['partners']['Row']
export type PartnerInsert = Database['public']['Tables']['partners']['Insert']
export type PartnerUpdate = Database['public']['Tables']['partners']['Update']

export type AnalysisCode = Database['public']['Tables']['analysis_codes']['Row']
export type AnalysisCodeInsert = Database['public']['Tables']['analysis_codes']['Insert']
export type AnalysisCodeUpdate = Database['public']['Tables']['analysis_codes']['Update']

export type JournalHeader = Database['public']['Tables']['journal_headers']['Row']
export type JournalHeaderInsert = Database['public']['Tables']['journal_headers']['Insert']
export type JournalHeaderUpdate = Database['public']['Tables']['journal_headers']['Update']

export type JournalDetail = Database['public']['Tables']['journal_details']['Row']
export type JournalDetailInsert = Database['public']['Tables']['journal_details']['Insert']
export type JournalDetailUpdate = Database['public']['Tables']['journal_details']['Update']

export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type UserRoleInsert = Database['public']['Tables']['user_roles']['Insert']
export type UserRoleUpdate = Database['public']['Tables']['user_roles']['Update']

export type JournalNumberSequence = Database['public']['Tables']['journal_number_sequences']['Row']
export type JournalNumberSequenceInsert = Database['public']['Tables']['journal_number_sequences']['Insert']
export type JournalNumberSequenceUpdate = Database['public']['Tables']['journal_number_sequences']['Update']

// ============================================================================
// ビジネスロジック型定義
// ============================================================================

// 仕訳入力フォーム用の型
export interface JournalEntryForm {
  journal_date: string
  description: string
  details: Array<{
    line_number: number
    debit_credit: 'D' | 'C'
    account_code: string
    sub_account_code?: string
    partner_code?: string
    analysis_code?: string
    amount: number
    line_description?: string
  }>
}

// 検索用の型
export interface AccountSearchFilter {
  account_type?: Account['account_type']
  is_active?: boolean
  search_text?: string
}

export interface PartnerSearchFilter {
  partner_type?: Partner['partner_type']
  is_active?: boolean
  search_text?: string
}

export interface JournalSearchFilter {
  date_from?: string
  date_to?: string
  account_code?: string
  partner_code?: string
  search_text?: string
}

// 集計結果の型
export interface AccountBalance {
  account_code: string
  account_name: string
  debit_total: number
  credit_total: number
  balance: number
}

export interface MonthlyTotal {
  year_month: string
  debit_total: number
  credit_total: number
  journal_count: number
}

// Join テーブル用の型
export interface JournalDetailWithNames extends JournalDetail {
  account_name?: string
  sub_account_name?: string
  partner_name?: string
  analysis_name?: string
}

export interface JournalHeaderWithDetails extends JournalHeader {
  details: JournalDetailWithNames[]
}

// ユーザー権限チェック用の型
export type UserRoleType = 'admin' | 'manager' | 'user'
export type PermissionAction = 'read' | 'create' | 'update' | 'delete'

export interface PermissionCheck {
  user_role: UserRoleType
  action: PermissionAction
  resource: 'accounts' | 'partners' | 'journal' | 'user_roles'
}
