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
  AnalysisType,
  TaxRate,
  JournalHeader,
  JournalDetail,
  JournalAttachment,
  Role,
  User,
  WorkflowOrganization,
  WorkflowOrganizationUser,
  WorkflowRoute,
  WorkflowRouteStep
} from "@/lib/database/prisma";

export type {
  Account,
  SubAccount,
  Partner,
  AnalysisCode,
  AnalysisType,
  TaxRate,
  JournalHeader,
  JournalDetail,
  JournalAttachment,
  Role,
  User,
  WorkflowOrganization,
  WorkflowOrganizationUser,
  WorkflowRoute,
  WorkflowRouteStep
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
  journalAttachments?: JournalAttachment[];
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

// ワークフロー関連の複合型
export interface WorkflowOrganizationWithUsers extends WorkflowOrganization {
  workflowOrganizationUsers: (WorkflowOrganizationUser & {
    user: User;
  })[];
}

export interface WorkflowRouteWithSteps extends WorkflowRoute {
  workflowRouteSteps: (WorkflowRouteStep & {
    workflowOrganization: WorkflowOrganization;
  })[];
}

// ワークフロー関連フィルター型
export interface WorkflowOrganizationFilter {
  isActive?: boolean;
}

export interface WorkflowRouteFilter {
  isActive?: boolean;
}