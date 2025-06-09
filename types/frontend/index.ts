/**
 * Frontend Type Definitions based on Prisma Schema
 * ============================================================================
 * Prismaスキーマから自動生成されたPrismaクライアント型をベースに、
 * フロントエンドで使用するためのcamelCase型を定義しています。
 * これらの型は、UIコンポーネントで直接使用されることを想定しています。
 * ============================================================================
 */

import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// マスタデータ型定義
// ============================================================================

/**
 * 勘定科目 - フロントエンド型
 */
export interface Account {
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountCode?: string | null;
  isDetail: boolean;
  isActive: boolean;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
  // リレーション（オプション）
  parentAccount?: Account | null;
  childAccounts?: Account[];
  subAccounts?: SubAccount[];
}

/**
 * 勘定科目作成用型
 */
export interface AccountCreate {
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountCode?: string | null;
  isDetail?: boolean;
  isActive?: boolean;
  sortOrder?: number | null;
}

/**
 * 勘定科目更新用型
 */
export interface AccountUpdate {
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  parentAccountCode?: string | null;
  isDetail?: boolean;
  isActive?: boolean;
  sortOrder?: number | null;
}

/**
 * 補助科目 - フロントエンド型
 */
export interface SubAccount {
  subAccountCode: string;
  accountCode: string;
  subAccountName: string;
  isActive: boolean;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
  // リレーション（オプション）
  account?: Account;
}

/**
 * 補助科目作成用型
 */
export interface SubAccountCreate {
  subAccountCode: string;
  accountCode: string;
  subAccountName: string;
  isActive?: boolean;
  sortOrder?: number | null;
}

/**
 * 補助科目更新用型
 */
export interface SubAccountUpdate {
  subAccountCode?: string;
  accountCode?: string;
  subAccountName?: string;
  isActive?: boolean;
  sortOrder?: number | null;
}

/**
 * 取引先 - フロントエンド型
 */
export interface Partner {
  partnerCode: string;
  partnerName: string;
  partnerKana?: string | null;
  partnerType: string;
  postalCode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 取引先作成用型
 */
export interface PartnerCreate {
  partnerCode: string;
  partnerName: string;
  partnerKana?: string | null;
  partnerType: string;
  postalCode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  isActive?: boolean;
}

/**
 * 取引先更新用型
 */
export interface PartnerUpdate {
  partnerCode?: string;
  partnerName?: string;
  partnerKana?: string | null;
  partnerType?: string;
  postalCode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  isActive?: boolean;
}

/**
 * 分析コード - フロントエンド型
 */
export interface AnalysisCode {
  analysisCode: string;
  analysisName: string;
  analysisType: string;
  parentAnalysisCode?: string | null;
  isActive: boolean;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
  // リレーション（オプション）
  parentAnalysisCodeRel?: AnalysisCode | null;
  childAnalysisCodes?: AnalysisCode[];
}

/**
 * 分析コード作成用型
 */
export interface AnalysisCodeCreate {
  analysisCode: string;
  analysisName: string;
  analysisType: string;
  parentAnalysisCode?: string | null;
  isActive?: boolean;
  sortOrder?: number | null;
}

/**
 * 分析コード更新用型
 */
export interface AnalysisCodeUpdate {
  analysisCode?: string;
  analysisName?: string;
  analysisType?: string;
  parentAnalysisCode?: string | null;
  isActive?: boolean;
  sortOrder?: number | null;
}

// ============================================================================
// 仕訳データ型定義
// ============================================================================

/**
 * 仕訳ヘッダ - フロントエンド型
 */
export interface JournalHeader {
  journalNumber: string;
  journalDate: Date;
  description?: string | null;
  totalAmount: Decimal;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  // リレーション（オプション）
  journalDetails?: JournalDetail[];
}

/**
 * 仕訳ヘッダ作成用型
 */
export interface JournalHeaderCreate {
  journalNumber: string;
  journalDate: Date;
  description?: string | null;
  totalAmount?: Decimal;
  createdBy?: string | null;
}

/**
 * 仕訳ヘッダ更新用型
 */
export interface JournalHeaderUpdate {
  journalNumber?: string;
  journalDate?: Date;
  description?: string | null;
  totalAmount?: Decimal;
  createdBy?: string | null;
}

/**
 * 仕訳明細 - フロントエンド型
 */
export interface JournalDetail {
  journalNumber: string;
  lineNumber: number;
  debitCredit: string;
  accountCode: string;
  subAccountCode?: string | null;
  partnerCode?: string | null;
  analysisCode?: string | null;
  amount: Decimal;
  lineDescription?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // リレーション（オプション）
  journalHeader?: JournalHeader;
  account?: Account;
  subAccount?: SubAccount | null;
  partner?: Partner | null;
  analysisCodeRel?: AnalysisCode | null;
}

/**
 * 仕訳明細作成用型
 */
export interface JournalDetailCreate {
  journalNumber: string;
  lineNumber: number;
  debitCredit: string;
  accountCode: string;
  subAccountCode?: string | null;
  partnerCode?: string | null;
  analysisCode?: string | null;
  amount: Decimal;
  lineDescription?: string | null;
}

/**
 * 仕訳明細更新用型
 */
export interface JournalDetailUpdate {
  journalNumber?: string;
  lineNumber?: number;
  debitCredit?: string;
  accountCode?: string;
  subAccountCode?: string | null;
  partnerCode?: string | null;
  analysisCode?: string | null;
  amount?: Decimal;
  lineDescription?: string | null;
}

// ============================================================================
// 複合型・ビュー型定義
// ============================================================================

/**
 * 仕訳明細（関連名称含む）- フロントエンド型
 */
export interface JournalDetailWithNames extends JournalDetail {
  accountName?: string;
  subAccountName?: string | null;
  partnerName?: string | null;
  analysisName?: string | null;
}

/**
 * 仕訳ヘッダ（明細含む）- フロントエンド型
 */
export interface JournalHeaderWithDetails extends JournalHeader {
  details: JournalDetailWithNames[];
}

/**
 * 勘定科目残高 - フロントエンド型
 */
export interface AccountBalance {
  accountCode: string;
  accountName: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

/**
 * 月次集計 - フロントエンド型
 */
export interface MonthlyTotal {
  yearMonth: string;
  debitTotal: number;
  creditTotal: number;
  journalCount: number;
}

// ============================================================================
// フォーム・検索フィルター型定義
// ============================================================================

/**
 * 仕訳入力フォーム - フロントエンド型
 */
export interface JournalEntryForm {
  journalDate: Date;
  description: string;
  details: Array<{
    lineNumber: number;
    debitCredit: "D" | "C";
    accountCode: string;
    subAccountCode?: string;
    partnerCode?: string;
    analysisCode?: string;
    amount: number;
    lineDescription?: string;
  }>;
}

/**
 * 勘定科目検索フィルター - フロントエンド型
 */
export interface AccountSearchFilter {
  accountType?: string;
  isActive?: boolean;
  searchText?: string;
}

/**
 * 取引先検索フィルター - フロントエンド型
 */
export interface PartnerSearchFilter {
  partnerType?: string;
  isActive?: boolean;
  searchText?: string;
}

/**
 * 仕訳検索フィルター - フロントエンド型
 */
export interface JournalSearchFilter {
  dateFrom?: Date;
  dateTo?: Date;
  accountCode?: string;
  partnerCode?: string;
  searchText?: string;
}

// ============================================================================
// エクスポート型定義（既存のSupabase型との区別）
// ============================================================================

// メインエンティティ型のエクスポート
export type {
  Account as FrontendAccount,
  AccountCreate as FrontendAccountCreate,
  AccountUpdate as FrontendAccountUpdate,
  AnalysisCode as FrontendAnalysisCode,
  AnalysisCodeCreate as FrontendAnalysisCodeCreate,
  AnalysisCodeUpdate as FrontendAnalysisCodeUpdate,
  JournalDetail as FrontendJournalDetail,
  JournalDetailCreate as FrontendJournalDetailCreate,
  JournalDetailUpdate as FrontendJournalDetailUpdate,
  JournalHeader as FrontendJournalHeader,
  JournalHeaderCreate as FrontendJournalHeaderCreate,
  JournalHeaderUpdate as FrontendJournalHeaderUpdate,
  Partner as FrontendPartner,
  PartnerCreate as FrontendPartnerCreate,
  PartnerUpdate as FrontendPartnerUpdate,
  SubAccount as FrontendSubAccount,
  SubAccountCreate as FrontendSubAccountCreate,
  SubAccountUpdate as FrontendSubAccountUpdate,
};

// 複合型のエクスポート
export type {
  AccountBalance as FrontendAccountBalance,
  JournalDetailWithNames as FrontendJournalDetailWithNames,
  JournalHeaderWithDetails as FrontendJournalHeaderWithDetails,
  MonthlyTotal as FrontendMonthlyTotal,
};

// フォーム・フィルター型のエクスポート
export type {
  AccountSearchFilter as FrontendAccountSearchFilter,
  JournalEntryForm as FrontendJournalEntryForm,
  JournalSearchFilter as FrontendJournalSearchFilter,
  PartnerSearchFilter as FrontendPartnerSearchFilter,
};
