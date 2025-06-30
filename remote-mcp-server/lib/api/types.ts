/**
 * API Types for Biz Clone Accounting System
 * ============================================================================
 * Next.js API Routes用の型定義・インターフェース
 * ============================================================================
 */

import { z } from "zod";

// ====================
// 基本型定義
// ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SearchOptions extends PaginationOptions {
  searchTerm?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuthContext {
  authenticated: boolean;
  userId?: string;
  scopes?: string[];
}

// ====================
// 仕訳関連型定義
// ====================

export interface JournalHeaderInput {
  journalDate: string; // ISO date string
  description?: string;
}

export interface JournalDetailInput {
  debitCredit: "debit" | "credit";
  accountCode: string;
  subAccountCode?: string;
  partnerCode?: string;
  analysisCode?: string;
  departmentCode?: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxCode?: string;
  description?: string;
}

export interface JournalSaveInput {
  header: {
    journalDate: string;
    description?: string;
  };
  details: Array<{
    debitCredit: "debit" | "credit";
    accountCode: string;
    subAccountCode?: string | null;
    partnerCode?: string | null;
    analysisCode?: string | null;
    departmentCode?: string | null;
    baseAmount: number;
    taxAmount: number;
    totalAmount: number;
    taxCode?: string | null;
    description?: string;
  }>;
  attachedFiles?: Array<{
    name: string;
    url: string;
    size: number;
    type?: string;
    uploadedAt?: string;
  }>;
}

export interface AttachedFileInput {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt?: string;
}

// ====================
// マスタデータ型定義
// ====================

export interface AccountInput {
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountCode?: string;
  isDetail?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  defaultTaxCode?: string;
}

export interface PartnerInput {
  partnerCode: string;
  partnerName: string;
  partnerKana?: string;
  partnerType: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  isActive?: boolean;
}

export interface DepartmentInput {
  departmentCode: string;
  departmentName: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AnalysisCodeInput {
  analysisCode: string;
  analysisName: string;
  analysisType: string;
  parentAnalysisCode?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ====================
// Zodバリデーションスキーマ
// ====================

export const journalHeaderSchema = z.object({
  journalDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "有効な日付形式で入力してください",
  }),
  description: z.string().optional(),
});

export const journalDetailSchema = z.object({
  debitCredit: z.enum(["debit", "credit"], {
    errorMap: () => ({ message: "借方または貸方を選択してください" }),
  }),
  accountCode: z.string().min(1, "勘定科目コードは必須です"),
  subAccountCode: z.string().optional(),
  partnerCode: z.string().optional(),
  analysisCode: z.string().optional(),
  departmentCode: z.string().optional(),
  baseAmount: z.number().min(0, "基本金額は0以上で入力してください"),
  taxAmount: z.number().min(0, "税額は0以上で入力してください"),
  totalAmount: z.number().min(1, "合計金額は1円以上で入力してください"),
  taxCode: z.string().optional(),
  description: z.string().optional(),
});

export const journalSaveSchema = z.object({
  header: journalHeaderSchema,
  details: z.array(journalDetailSchema).min(2, "明細は2行以上必要です"),
  attachedFiles: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().min(0),
    type: z.string(),
    uploadedAt: z.string().optional(),
  })).optional(),
});

export const accountSchema = z.object({
  accountCode: z.string().max(
    10,
    "勘定科目コードは10文字以内で入力してください",
  ),
  accountName: z.string().max(100, "勘定科目名は100文字以内で入力してください"),
  accountType: z.enum(["資産", "負債", "純資産", "収益", "費用"], {
    errorMap: () => ({ message: "有効な勘定科目区分を選択してください" }),
  }),
  parentAccountCode: z.string().max(10).optional(),
  isDetail: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  defaultTaxCode: z.string().max(10).optional(),
});

export const partnerSchema = z.object({
  partnerCode: z.string().max(15, "取引先コードは15文字以内で入力してください"),
  partnerName: z.string().max(100, "取引先名は100文字以内で入力してください"),
  partnerKana: z.string().max(100).optional(),
  partnerType: z.string().max(20, "取引先区分は20文字以内で入力してください"),
  postalCode: z.string().max(8).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional(),
  contactPerson: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export const departmentSchema = z.object({
  departmentCode: z.string().max(
    10,
    "部門コードは10文字以内で入力してください",
  ),
  departmentName: z.string().max(100, "部門名は100文字以内で入力してください"),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const analysisCodeSchema = z.object({
  analysisCode: z.string().max(15, "分析コードは15文字以内で入力してください"),
  analysisName: z.string().max(
    100,
    "分析コード名は100文字以内で入力してください",
  ),
  analysisType: z.string().max(20, "分析種別は20文字以内で入力してください"),
  parentAnalysisCode: z.string().max(15).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// ====================
// エラー型定義
// ====================

export enum ApiErrorType {
  VALIDATION = "VALIDATION",
  BUSINESS = "BUSINESS",
  NOT_FOUND = "NOT_FOUND",
  INTERNAL = "INTERNAL",
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  details?: any;
  code?: string;
}

export class ApiException extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    this.name = "ApiException";
  }
}
