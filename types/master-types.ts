/**
 * マスタデータ区分値の型定義
 * ============================================================================
 * 各マスタの区分値を統一管理し、型安全性を向上
 * ============================================================================
 */

// 勘定科目種別（配列ベース一元管理）
export const ACCOUNT_TYPE_LIST = [
  "資産",
  "負債", 
  "純資産",
  "収益",
  "費用"
] as const;

// 型定義は配列から自動生成
export type AccountType = typeof ACCOUNT_TYPE_LIST[number];

// オプション配列も自動生成
export const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPE_LIST.map(type => ({
  value: type,
  label: type
}));

// 後方互換性のためのオブジェクト（必要に応じて）
export const ACCOUNT_TYPES = {
  ASSET: ACCOUNT_TYPE_LIST[0],      // "資産"
  LIABILITY: ACCOUNT_TYPE_LIST[1],   // "負債"
  EQUITY: ACCOUNT_TYPE_LIST[2],      // "純資産"
  REVENUE: ACCOUNT_TYPE_LIST[3],     // "収益" 
  EXPENSE: ACCOUNT_TYPE_LIST[4]      // "費用"
} as const;

// 取引先種別（配列ベース一元管理）
export const PARTNER_TYPE_LIST = [
  "得意先",
  "仕入先", 
  "金融機関",
  "その他"
] as const;

// 型定義は配列から自動生成
export type PartnerType = typeof PARTNER_TYPE_LIST[number];

// オプション配列も自動生成
export const PARTNER_TYPE_OPTIONS = PARTNER_TYPE_LIST.map(type => ({
  value: type,
  label: type
}));

// 後方互換性のためのオブジェクト（必要に応じて）
export const PARTNER_TYPES = {
  CUSTOMER: PARTNER_TYPE_LIST[0],   // "得意先"
  SUPPLIER: PARTNER_TYPE_LIST[1],   // "仕入先"
  BANK: PARTNER_TYPE_LIST[2],       // "金融機関"
  OTHER: PARTNER_TYPE_LIST[3]       // "その他"
} as const;


// 型ガード関数
export const isValidAccountType = (value: string): value is AccountType => {
  return ACCOUNT_TYPE_LIST.includes(value as AccountType);
};

export const isValidPartnerType = (value: string): value is PartnerType => {
  return PARTNER_TYPE_LIST.includes(value as PartnerType);
};

// ロール区分（配列ベース一元管理）
export const ROLE_TYPE_LIST = [
  "管理者",
  "経理担当",
  "一般ユーザー",
  "閲覧のみ"
] as const;

// 型定義は配列から自動生成
export type RoleType = typeof ROLE_TYPE_LIST[number];

// オプション配列も自動生成
export const ROLE_TYPE_OPTIONS = ROLE_TYPE_LIST.map(type => ({
  value: type,
  label: type
}));

// 後方互換性のためのオブジェクト（必要に応じて）
export const ROLE_TYPES = {
  ADMIN: ROLE_TYPE_LIST[0],        // "管理者"
  ACCOUNTANT: ROLE_TYPE_LIST[1],   // "経理担当"
  USER: ROLE_TYPE_LIST[2],         // "一般ユーザー"
  VIEWER: ROLE_TYPE_LIST[3]        // "閲覧のみ"
} as const;

// 型ガード関数
export const isValidRoleType = (value: string): value is RoleType => {
  return ROLE_TYPE_LIST.includes(value as RoleType);
};

// 分析コード種別（配列ベース一元管理）
export const ANALYSIS_TYPE_LIST = [
  "部門",
  "プロジェクト", 
  "製品",
  "地域",
  "顧客"
] as const;

// 型定義は配列から自動生成
export type AnalysisType = typeof ANALYSIS_TYPE_LIST[number];

// オプション配列も自動生成
export const ANALYSIS_TYPE_OPTIONS = ANALYSIS_TYPE_LIST.map(type => ({
  value: type,
  label: type
}));

// 後方互換性のためのオブジェクト（必要に応じて）
export const ANALYSIS_TYPES = {
  DEPARTMENT: ANALYSIS_TYPE_LIST[0],  // "部門"
  PROJECT: ANALYSIS_TYPE_LIST[1],     // "プロジェクト"
  PRODUCT: ANALYSIS_TYPE_LIST[2],     // "製品"
  REGION: ANALYSIS_TYPE_LIST[3],      // "地域"
  CUSTOMER: ANALYSIS_TYPE_LIST[4]     // "顧客"
} as const;

// 型ガード関数
export const isValidAnalysisType = (value: string): value is AnalysisType => {
  return ANALYSIS_TYPE_LIST.includes(value as AnalysisType);
};

