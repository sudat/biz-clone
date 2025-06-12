/**
 * Client Component用の型定義
 * Prismaの型からDecimal型をnumber型に変換したクライアント用の型定義
 */

import type { Account, SubAccount, Partner, AnalysisCode, JournalHeader, JournalDetail } from "@/lib/database/prisma";

// ============================================================================
// マスタ型定義（Client Component用）
// ============================================================================

/**
 * 勘定科目（Client Component用）
 * defaultTaxRateをDecimalからnumberに変換
 */
export type AccountForClient = Omit<Account, 'defaultTaxRate'> & {
  defaultTaxRate: number | null;
};

/**
 * 補助科目（Client Component用）
 * 現在はDecimalフィールドなしのため、そのまま使用
 */
export type SubAccountForClient = SubAccount;

/**
 * 取引先（Client Component用）
 * 現在はDecimalフィールドなしのため、そのまま使用
 */
export type PartnerForClient = Partner;

/**
 * 分析コード（Client Component用）
 * 現在はDecimalフィールドなしのため、そのまま使用
 */
export type AnalysisCodeForClient = AnalysisCode;

// ============================================================================
// 仕訳型定義（Client Component用）
// ============================================================================

/**
 * 仕訳ヘッダ（Client Component用）
 * totalAmountをDecimalからnumberに変換
 */
export type JournalHeaderForClient = Omit<JournalHeader, 'totalAmount'> & {
  totalAmount: number;
};

/**
 * 仕訳明細（Client Component用）
 * baseAmount, taxAmount, totalAmount, taxRateをDecimalからnumberに変換
 */
export type JournalDetailForClient = Omit<JournalDetail, 'baseAmount' | 'taxAmount' | 'totalAmount' | 'taxRate'> & {
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number | null;
};

// ============================================================================
// レスポンス型定義
// ============================================================================

/**
 * Server Actions共通レスポンス型
 */
export interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 勘定科目レスポンス型
 */
export type AccountsResponse = ServerActionResponse<AccountForClient[]>;

/**
 * 補助科目レスポンス型
 */
export type SubAccountsResponse = ServerActionResponse<SubAccountForClient[]>;

/**
 * 取引先レスポンス型
 */
export type PartnersResponse = ServerActionResponse<PartnerForClient[]>;

/**
 * 分析コードレスポンス型
 */
export type AnalysisCodesResponse = ServerActionResponse<AnalysisCodeForClient[]>;