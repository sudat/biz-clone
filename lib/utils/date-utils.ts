/**
 * 日付変換ユーティリティ
 * ============================================================================
 * UTC時間と日本時間の変換処理
 * ============================================================================
 */

/**
 * UTC時間を日本時間（JST）に変換
 * @param utcDate UTC時間のDateオブジェクト
 * @returns 日本時間のDateオブジェクト
 */
export function toJST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
}

/**
 * 日本時間をUTC時間に変換
 * @param jstDate 日本時間のDateオブジェクト
 * @returns UTC時間のDateオブジェクト
 */
export function toUTC(jstDate: Date): Date {
  return new Date(jstDate.getTime() - (9 * 60 * 60 * 1000));
}

/**
 * Dateオブジェクトが有効かチェック
 * @param date チェック対象のDate
 * @returns 有効な日付かどうか
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * UTC日時を日本時間の日付として変換
 * フロントエンドから送られるUTC時間を、日本時間の日付部分のみのDateオブジェクトに変換
 * @param utcDate UTC時間のDate型またはISO文字列
 * @returns 日本時間の日付を表すDateオブジェクト（時間は00:00:00 UTC）
 */
export function convertToJapaneseDate(utcDate: Date | string): Date {
  const inputDate = utcDate instanceof Date ? utcDate : new Date(utcDate);
  const jstDate = new Date(inputDate.getTime() + (9 * 60 * 60 * 1000));
  return new Date(Date.UTC(jstDate.getFullYear(), jstDate.getMonth(), jstDate.getDate()));
}