/**
 * 統一型定義（完全camelCase）
 * ============================================================================
 * Prisma型をベースとした単一型システム
 * データベース = Prisma = Frontend で完全統一
 * ============================================================================
 */

// Prisma生成型を統一データベースから使用
import type {
  Account,
  SubAccount,
  Partner,
  AnalysisCode,
  JournalHeader,
  JournalDetail
} from "@/lib/database/prisma";

export type {
  Account,
  SubAccount,
  Partner,
  AnalysisCode,
  JournalHeader,
  JournalDetail
};

// よく使用される複合型
export interface AccountWithDetails extends Account {
  subAccounts?: SubAccount[];
}

export interface JournalEntryWithDetails extends JournalHeader {
  journalDetails: JournalDetail[];
}

// Server Action共通レスポンス型
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 検索フィルター型
export interface AccountFilter {
  accountType?: string;
  isActive?: boolean;
}

export interface PartnerFilter {
  partnerType?: string;
  isActive?: boolean;
}

export interface AnalysisCodeFilter {
  analysisType?: string;
  isActive?: boolean;
}