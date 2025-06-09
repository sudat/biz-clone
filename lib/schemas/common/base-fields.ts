/**
 * 基本フィールドスキーマ
 * ============================================================================
 * アプリケーション全体で再利用可能な基本的なフィールドバリデーションスキーマ
 * 
 * 主要機能:
 * 1. コード系フィールドの統一制約
 * 2. 名称系フィールドの統一制約
 * 3. 日付・金額・連絡先情報の標準化
 * 4. 日本固有の業務ルール対応
 * ============================================================================
 */

import { z } from "zod";

/**
 * コード系フィールドのスキーマファクトリー
 * @param entityName エンティティ名（エラーメッセージに使用）
 * @param maxLength 最大文字数（デフォルト: 15）
 * @param pattern 正規表現パターン（デフォルト: 英数字のみ）
 */
export function createCodeField(
  entityName: string, 
  maxLength: number = 15,
  pattern?: RegExp
) {
  let schema = z.string()
    .min(1, `${entityName}コードは必須です`)
    .max(maxLength, `${entityName}コードは${maxLength}文字以内で入力してください`);
  
  if (pattern) {
    schema = schema.regex(pattern, "英数字のみ使用可能です");
  }
  
  return schema;
}

/**
 * 名称系フィールドのスキーマファクトリー
 * @param entityName エンティティ名（エラーメッセージに使用）
 * @param maxLength 最大文字数（デフォルト: 100）
 * @param required 必須かどうか（デフォルト: true）
 */
export function createNameField(
  entityName: string, 
  maxLength: number = 100,
  required: boolean = true
) {
  if (required) {
    return z.string()
      .min(1, `${entityName}名称は必須です`)
      .max(maxLength, `${entityName}名称は${maxLength}文字以内で入力してください`);
  } else {
    return z.string()
      .max(maxLength, `${entityName}名称は${maxLength}文字以内で入力してください`)
      .optional();
  }
}

/**
 * かな名称フィールドのスキーマ
 * @param entityName エンティティ名（エラーメッセージに使用）
 * @param maxLength 最大文字数（デフォルト: 100）
 */
export function createKanaField(entityName: string, maxLength: number = 100) {
  return z.string()
    .max(maxLength, `${entityName}かなは${maxLength}文字以内で入力してください`)
    .optional();
}

/**
 * メールアドレスフィールドのスキーマ
 * @param required 必須かどうか（デフォルト: true）
 */
export function createEmailField(required: boolean = true) {
  const baseSchema = z.string()
    .email("正しいメールアドレスを入力してください")
    .max(100, "メールアドレスは100文字以内で入力してください");
    
  if (required) {
    return baseSchema.min(1, "メールアドレスは必須です");
  } else {
    return baseSchema.optional().or(z.literal(""));
  }
}

/**
 * 電話番号フィールドのスキーマ
 */
export const phoneField = z.string()
  .max(20, "電話番号は20文字以内で入力してください")
  .optional();

/**
 * 郵便番号フィールドのスキーマ（日本形式）
 */
export const postalCodeField = z.string()
  .max(8, "郵便番号は8文字以内で入力してください")
  .regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません（例: 123-4567）")
  .optional();

/**
 * 住所フィールドのスキーマ
 */
export const addressField = z.string()
  .max(200, "住所は200文字以内で入力してください")
  .optional();

/**
 * 金額フィールドのスキーマ
 * @param allowNegative 負の値を許可するか（デフォルト: false）
 * @param maxAmount 最大金額（デフォルト: 999999999999）
 */
export function createAmountField(
  allowNegative: boolean = false, 
  maxAmount: number = 999999999999
) {
  let schema = z.number()
    .max(maxAmount, `金額は${maxAmount.toLocaleString()}以下で入力してください`);
    
  if (!allowNegative) {
    schema = schema.min(0, "金額は0以上で入力してください");
  }
  
  return schema;
}

/**
 * 並び順フィールドのスキーマ
 */
export const sortOrderField = z.number()
  .int("並び順は整数で入力してください")
  .min(0, "並び順は0以上で入力してください")
  .max(9999, "並び順は9999以下で入力してください")
  .nullable()
  .optional();

/**
 * 有効フラグフィールドのスキーマ
 */
export const isActiveField = z.boolean().default(true);

/**
 * 担当者名フィールドのスキーマ
 */
export const contactPersonField = z.string()
  .max(50, "担当者名は50文字以内で入力してください")
  .optional();

/**
 * 摘要・備考フィールドのスキーマ
 * @param fieldName フィールド名（エラーメッセージに使用）
 * @param maxLength 最大文字数（デフォルト: 500）
 */
export function createMemoField(fieldName: string = "摘要", maxLength: number = 500) {
  return z.string()
    .max(maxLength, `${fieldName}は${maxLength}文字以内で入力してください`)
    .optional();
}

/**
 * パスワードフィールドのスキーマ
 * @param minLength 最小文字数（デフォルト: 8）
 * @param requireComplexity 複雑性を要求するか（デフォルト: true）
 */
export function createPasswordField(
  minLength: number = 8, 
  requireComplexity: boolean = true
) {
  let schema = z.string()
    .min(1, "パスワードは必須です")
    .min(minLength, `パスワードは${minLength}文字以上で入力してください`);
    
  if (requireComplexity) {
    schema = schema
      .regex(/[A-Z]/, "パスワードには大文字を含めてください")
      .regex(/[a-z]/, "パスワードには小文字を含めてください")
      .regex(/[0-9]/, "パスワードには数字を含めてください");
  }
  
  return schema;
}

/**
 * URL フィールドのスキーマ
 */
export const urlField = z.string()
  .url("正しいURLを入力してください")
  .max(200, "URLは200文字以内で入力してください")
  .optional();

/**
 * 勘定科目コード専用スキーマ（10文字制限）
 */
export const accountCodeField = createCodeField("勘定科目", 10, /^[A-Z0-9]+$/);

/**
 * 補助科目コード専用スキーマ（15文字制限）
 */
export const subAccountCodeField = createCodeField("補助科目", 15, /^[A-Z0-9]+$/);

/**
 * 取引先コード専用スキーマ（15文字制限）
 */
export const partnerCodeField = createCodeField("取引先", 15, /^[A-Z0-9]+$/);

/**
 * 分析コード専用スキーマ（10文字制限）
 */
export const analysisCodeField = createCodeField("分析コード", 10, /^[A-Z0-9]+$/);

/**
 * 仕訳番号フィールドのスキーマ（YYYYMMDDXXXXXXX形式）
 */
export const journalNumberField = z.string()
  .regex(/^\d{8}\d{7}$/, "仕訳番号の形式が正しくありません（YYYYMMDDXXXXXXX形式）");

/**
 * 日付文字列フィールドのスキーマ（YYYY-MM-DD形式）
 */
export const dateStringField = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません（YYYY-MM-DD形式）");

/**
 * 時刻文字列フィールドのスキーマ（HH:MM形式）
 */
export const timeStringField = z.string()
  .regex(/^\d{2}:\d{2}$/, "時刻の形式が正しくありません（HH:MM形式）")
  .optional();