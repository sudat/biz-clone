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
  JournalDetail,
  Role,
  User
} from "@/lib/database/prisma";

export type {
  Account,
  SubAccount,
  Partner,
  AnalysisCode,
  JournalHeader,
  JournalDetail,
  Role,
  User
};

// フロントエンド用のユーザー型（パスワードハッシュなしのセキュア版）
export type UserForClient = Omit<User, 'passwordHash'> & {
  passwordHash?: string;
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

export interface RoleFilter {
  isActive?: boolean;
}

export interface UserFilter {
  roleCode?: string;
  isActive?: boolean;
}

// よく使用される複合型（認証・認可用）
export interface UserWithRole extends User {
  role: Role;
}

export interface UserProfile {
  userId: string;
  userCode: string;
  userName: string;
  email: string;
  roleCode: string;
  roleName: string;
  isActive: boolean;
}