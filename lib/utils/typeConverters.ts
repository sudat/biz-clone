/**
 * 型変換ユーティリティ
 * snake_case ⟷ camelCase 相互変換
 *
 * 目的: 既存Supabase UI（snake_case）と新しいPrisma Server Actions（camelCase）の橋渡し
 */

// ====================
// 型定義
// ====================

type AnyObject = Record<string, unknown>;

// ====================
// キー変換ヘルパー関数
// ====================

/**
 * snake_case文字列をcamelCaseに変換
 * 例: "account_code" → "accountCode"
 */
function snakeToCamelKey(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * camelCase文字列をsnake_caseに変換
 * 例: "accountCode" → "account_code"
 */
function camelToSnakeKey(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// ====================
// メイン変換関数
// ====================

/**
 * snake_caseオブジェクトをcamelCaseに変換（再帰的）
 */
export function snakeToCamel<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  // プリミティブ値の場合はそのまま返す
  if (typeof obj !== "object") {
    return obj as T;
  }

  // 配列の場合は各要素を再帰的に変換
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item)) as T;
  }

  // Dateオブジェクトの場合はそのまま返す
  if (obj instanceof Date) {
    return obj as T;
  }

  // オブジェクトの場合はキーを変換し、値を再帰的に変換
  const result: AnyObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamelKey(key);
    result[camelKey] = snakeToCamel(value);
  }

  return result as T;
}

/**
 * camelCaseオブジェクトをsnake_caseに変換（再帰的）
 */
export function camelToSnake<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  // プリミティブ値の場合はそのまま返す
  if (typeof obj !== "object") {
    return obj as T;
  }

  // 配列の場合は各要素を再帰的に変換
  if (Array.isArray(obj)) {
    return obj.map((item) => camelToSnake(item)) as T;
  }

  // Dateオブジェクトの場合は文字列に変換（Supabase互換性）
  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }

  // オブジェクトの場合はキーを変換し、値を再帰的に変換
  const result: AnyObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnakeKey(key);
    result[snakeKey] = camelToSnake(value);
  }

  return result as T;
}

// ====================
// 特化型変換関数（型安全性向上）
// ====================

/**
 * 配列のキー変換（型安全）
 */
export function convertArrayKeys<T, U>(
  array: T[],
  converter: (obj: T) => U,
): U[] {
  return array.map(converter);
}

/**
 * オプショナルなオブジェクトの変換
 */
export function convertOptional<T, U>(
  obj: T | null | undefined,
  converter: (obj: T) => U,
): U | null | undefined {
  if (obj === null || obj === undefined) {
    return null as U | null | undefined;
  }
  return converter(obj);
}

// ====================
// 使用例とテストケース（コメント）
// ====================

/*
使用例:

// Snake to Camel
const supabaseData = {
  account_code: "1001",
  account_name: "現金",
  created_at: "2024-01-01T00:00:00Z",
  sub_accounts: [
    { sub_account_code: "1001-01", sub_account_name: "現金手許有高" }
  ]
};

const prismaData = snakeToCamel(supabaseData);
// Result: {
//   accountCode: "1001",
//   accountName: "現金",
//   createdAt: "2024-01-01T00:00:00Z",
//   subAccounts: [
//     { subAccountCode: "1001-01", subAccountName: "現金手許有高" }
//   ]
// }

// Camel to Snake
const backToSnake = camelToSnake(prismaData);
// Result: 元のsupabaseDataと同じ構造

*/
