/**
 * 日付・時刻関連スキーマ
 * ============================================================================
 * 日付・時刻・期間に関する統一バリデーションスキーマ
 * 
 * 主要機能:
 * 1. 日付形式の統一（ISO形式、日本形式対応）
 * 2. 時刻・日時の制約
 * 3. 期間・範囲のバリデーション
 * 4. 会計業務固有の日付ルール
 * ============================================================================
 */

import { z } from "zod";
import { getFiscalYear, validateFiscalPeriod, isBusinessDay } from "./validation-rules";

/**
 * 基本的な日付スキーマ（YYYY-MM-DD形式）
 */
export const dateField = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません（YYYY-MM-DD形式）")
  .refine((dateString) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }, {
    message: "有効な日付を入力してください"
  });

/**
 * 必須日付フィールド
 */
export const requiredDateField = dateField.min(1, "日付は必須です");

/**
 * オプション日付フィールド
 */
export const optionalDateField = dateField.optional();

/**
 * 時刻スキーマ（HH:MM形式）
 */
export const timeField = z.string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "時刻の形式が正しくありません（HH:MM形式）")
  .optional();

/**
 * 日時スキーマ（ISO 8601形式）
 */
export const dateTimeField = z.string()
  .datetime({ message: "日時の形式が正しくありません（ISO 8601形式）" });

/**
 * タイムスタンプフィールド（作成日時・更新日時用）
 */
export const timestampField = z.string()
  .datetime()
  .optional();

/**
 * 仕訳日付スキーマ（営業日制限付き）
 */
export const journalDateField = dateField
  .refine((dateString) => {
    const date = new Date(dateString);
    return isBusinessDay(date);
  }, {
    message: "仕訳日は営業日（平日）を選択してください"
  });

/**
 * 過去日付制限スキーマ
 * @param allowFuture 未来日を許可するか（デフォルト: true）
 */
export function createDateField(allowFuture: boolean = true) {
  let schema = dateField;
  
  if (!allowFuture) {
    schema = schema.refine((dateString) => {
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 時刻をクリア
      
      return date <= today;
    }, {
      message: "未来の日付は選択できません"
    });
  }
  
  return schema;
}

/**
 * 期間範囲スキーマ
 */
export const periodSchema = z.object({
  startDate: requiredDateField,
  endDate: requiredDateField
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  const validation = validateFiscalPeriod(startDate, endDate);
  return validation.isValid;
}, {
  message: "期間の設定が正しくありません",
  path: ["endDate"]
});

/**
 * 会計年度スキーマ
 */
export const fiscalYearSchema = z.object({
  fiscalYear: z.number()
    .int("会計年度は整数で入力してください")
    .min(1900, "会計年度は1900年以降で入力してください")
    .max(2100, "会計年度は2100年以前で入力してください")
}).transform((data) => {
  // 会計年度から期間を計算
  const startDate = new Date(data.fiscalYear, 3, 1); // 4月1日
  const endDate = new Date(data.fiscalYear + 1, 2, 31); // 翌年3月31日
  
  return {
    fiscalYear: data.fiscalYear,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
});

/**
 * 月度スキーマ（YYYY-MM形式）
 */
export const monthField = z.string()
  .regex(/^\d{4}-\d{2}$/, "月度の形式が正しくありません（YYYY-MM形式）")
  .refine((monthString) => {
    const [year, month] = monthString.split('-').map(Number);
    return year >= 1900 && year <= 2100 && month >= 1 && month <= 12;
  }, {
    message: "有効な月度を入力してください"
  });

/**
 * 四半期スキーマ
 */
export const quarterSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  quarter: z.number().int().min(1).max(4)
}).transform((data) => {
  // 四半期から期間を計算
  const startMonth = (data.quarter - 1) * 3 + 4; // 会計年度基準（4月開始）
  const endMonth = startMonth + 2;
  
  let startYear = data.year;
  let endYear = data.year;
  
  // 年を跨ぐ場合の調整
  if (startMonth > 12) {
    startYear += 1;
  }
  if (endMonth > 12) {
    endYear += 1;
  }
  
  const adjustedStartMonth = startMonth > 12 ? startMonth - 12 : startMonth;
  const adjustedEndMonth = endMonth > 12 ? endMonth - 12 : endMonth;
  
  const startDate = new Date(startYear, adjustedStartMonth - 1, 1);
  const endDate = new Date(endYear, adjustedEndMonth, 0); // 月末日
  
  return {
    year: data.year,
    quarter: data.quarter,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
});

/**
 * 日付範囲検索スキーマ
 */
export const dateRangeSearchSchema = z.object({
  startDate: optionalDateField,
  endDate: optionalDateField
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return startDate <= endDate;
  }
  return true;
}, {
  message: "開始日は終了日以前の日付を選択してください",
  path: ["endDate"]
});

/**
 * 年齢計算（生年月日から）
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 生年月日スキーマ（年齢制限付き）
 */
export const birthDateSchema = dateField
  .refine((dateString) => {
    const age = calculateAge(dateString);
    return age >= 0 && age <= 150;
  }, {
    message: "有効な生年月日を入力してください"
  });

/**
 * 営業日計算（土日祝日を除く）
 */
export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      addedDays++;
    }
  }
  
  return result;
}

/**
 * 期日スキーマ（営業日での計算）
 */
export const dueDateSchema = z.object({
  baseDate: requiredDateField,
  businessDays: z.number().int().min(0).max(365)
}).transform((data) => {
  const baseDate = new Date(data.baseDate);
  const dueDate = addBusinessDays(baseDate, data.businessDays);
  
  return {
    baseDate: data.baseDate,
    dueDate: dueDate.toISOString().split('T')[0],
    businessDays: data.businessDays
  };
});

/**
 * 現在の会計年度を取得
 */
export function getCurrentFiscalYear(): number {
  return getFiscalYear(new Date());
}

/**
 * 今日の日付（YYYY-MM-DD形式）
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 月末日を取得
 */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 月末日付スキーマ
 */
export const monthEndDateSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12)
}).transform((data) => {
  const lastDay = getLastDayOfMonth(data.year, data.month);
  const date = new Date(data.year, data.month - 1, lastDay);
  
  return {
    year: data.year,
    month: data.month,
    lastDay,
    date: date.toISOString().split('T')[0]
  };
});