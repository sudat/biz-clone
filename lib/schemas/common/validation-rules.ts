/**
 * 日本会計業務固有のバリデーションルール
 * ============================================================================
 * 日本の会計業務で使用される固有の分類、制約、ルールを定義
 * 
 * 主要機能:
 * 1. 勘定科目5大区分の定義
 * 2. 取引先種別の標準化
 * 3. 仕訳借方貸方区分
 * 4. 分析コード種別
 * ============================================================================
 */

import { z } from "zod";

/**
 * 勘定科目の5大区分（日本基準）
 */
export const ACCOUNT_TYPES = [
  "資産",
  "負債", 
  "資本",
  "収益",
  "費用"
] as const;

export type AccountType = typeof ACCOUNT_TYPES[number];

/**
 * 勘定科目タイプのZodスキーマ
 */
export const accountTypeField = z.enum(ACCOUNT_TYPES, {
  errorMap: () => ({ message: "有効な勘定科目タイプを選択してください" })
});

/**
 * 取引先の種別
 */
export const PARTNER_TYPES = [
  "得意先",
  "仕入先", 
  "金融機関",
  "その他"
] as const;

export type PartnerType = typeof PARTNER_TYPES[number];

/**
 * 取引先タイプのZodスキーマ
 */
export const partnerTypeField = z.enum(PARTNER_TYPES, {
  errorMap: () => ({ message: "有効な取引先種別を選択してください" })
});

/**
 * 借方貸方区分
 */
export const DEBIT_CREDIT = ["D", "C"] as const;

export type DebitCredit = typeof DEBIT_CREDIT[number];

/**
 * 借方貸方区分のZodスキーマ
 */
export const debitCreditField = z.enum(DEBIT_CREDIT, {
  errorMap: () => ({ message: "借方（D）または貸方（C）を選択してください" })
});

/**
 * 一般的な分析コード種別
 * （プロジェクトに応じてカスタマイズ可能）
 */
export const ANALYSIS_CODE_TYPES = [
  "部門",
  "プロジェクト",
  "製品",
  "地域",
  "顧客分類",
  "費用分類",
  "その他"
] as const;

export type AnalysisCodeType = typeof ANALYSIS_CODE_TYPES[number];

/**
 * 分析コードタイプのZodスキーマ
 */
export const analysisCodeTypeField = z.string()
  .min(1, "分析タイプは必須です")
  .max(50, "分析タイプは50文字以内で入力してください");

/**
 * 仕訳の状態
 */
export const JOURNAL_STATUS = [
  "draft",      // 下書き
  "pending",    // 承認待ち
  "approved",   // 承認済み
  "posted",     // 転記済み
  "cancelled"   // 取消
] as const;

export type JournalStatus = typeof JOURNAL_STATUS[number];

/**
 * 仕訳状態のZodスキーマ
 */
export const journalStatusField = z.enum(JOURNAL_STATUS, {
  errorMap: () => ({ message: "有効な仕訳状態を選択してください" })
});

/**
 * 日本の会計期間（4月始まり）
 */
export const FISCAL_YEAR_START_MONTH = 4;

/**
 * 会計年度を取得する関数
 * @param date 基準日
 * @returns 会計年度（西暦）
 */
export function getFiscalYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0ベースを1ベースに変換
  
  if (month >= FISCAL_YEAR_START_MONTH) {
    return year;
  } else {
    return year - 1;
  }
}

/**
 * 会計年度のバリデーション
 */
export const fiscalYearField = z.number()
  .int("会計年度は整数で入力してください")
  .min(1900, "会計年度は1900年以降で入力してください")
  .max(2100, "会計年度は2100年以前で入力してください");

/**
 * 仕訳番号の生成ルール
 * YYYYMMDDXXXXXXX（日付8桁 + 連番7桁）
 */
export function generateJournalNumberPattern(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

/**
 * 仕訳番号の妥当性チェック
 */
export function validateJournalNumber(journalNumber: string): boolean {
  // YYYYMMDDXXXXXXX形式（15桁）
  if (journalNumber.length !== 15) return false;
  
  // 全て数字かチェック
  if (!/^\d{15}$/.test(journalNumber)) return false;
  
  // 日付部分の妥当性チェック
  const dateStr = journalNumber.substring(0, 8);
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));
  
  // 基本的な日付妥当性チェック
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  return true;
}

/**
 * 仕訳番号のZodスキーマ（カスタムバリデーション付き）
 */
export const journalNumberWithValidationField = z.string()
  .refine(validateJournalNumber, {
    message: "仕訳番号の形式が正しくありません（YYYYMMDDXXXXXXX形式、15桁の数字）"
  });

/**
 * 金額の精度制限（小数点以下の桁数）
 */
export const AMOUNT_DECIMAL_PLACES = 0; // 日本円は整数

/**
 * 金額フィールド（日本円専用）
 */
export const amountJPYField = z.number()
  .int("金額は整数で入力してください（円単位）")
  .min(0, "金額は0以上で入力してください")
  .max(999999999999, "金額は999,999,999,999円以下で入力してください");

/**
 * 借方貸方の金額検証（仕訳明細用）
 */
export function validateDebitCreditBalance(
  details: Array<{ debitCredit: DebitCredit; amount: number }>
): { isValid: boolean; message?: string } {
  const debitTotal = details
    .filter(d => d.debitCredit === "D")
    .reduce((sum, d) => sum + d.amount, 0);
    
  const creditTotal = details
    .filter(d => d.debitCredit === "C")
    .reduce((sum, d) => sum + d.amount, 0);
    
  if (debitTotal !== creditTotal) {
    return {
      isValid: false,
      message: `借方合計（${debitTotal.toLocaleString()}円）と貸方合計（${creditTotal.toLocaleString()}円）が一致しません`
    };
  }
  
  return { isValid: true };
}

/**
 * 日本の祝日・休業日チェック（簡易版）
 * 注：実際の運用では外部ライブラリやAPIを使用することを推奨
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  // 土曜日（6）と日曜日（0）は休業日
  return day !== 0 && day !== 6;
}

/**
 * 営業日のバリデーション
 */
export const businessDayField = z.date()
  .refine(isBusinessDay, {
    message: "営業日（平日）を選択してください"
  });

/**
 * 会計期間の範囲チェック
 */
export function validateFiscalPeriod(
  startDate: Date, 
  endDate: Date
): { isValid: boolean; message?: string } {
  if (startDate >= endDate) {
    return {
      isValid: false,
      message: "期間の開始日は終了日より前の日付を選択してください"
    };
  }
  
  // 1年を超える期間はエラー
  const oneYear = 365 * 24 * 60 * 60 * 1000; // ミリ秒
  if (endDate.getTime() - startDate.getTime() > oneYear) {
    return {
      isValid: false,
      message: "会計期間は1年以内で設定してください"
    };
  }
  
  return { isValid: true };
}