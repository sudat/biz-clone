/**
 * 型変換ユーティリティ（最適化版）
 * ============================================================================
 * snake_case ⟷ camelCase 相互変換 with パフォーマンス最適化
 * 
 * 主要機能:
 * 1. メモ化による高速変換
 * 2. 型安全な変換処理
 * 3. パフォーマンス統計収集
 * 4. 大量データ対応
 * ============================================================================
 */

import { 
  globalCacheManager, 
  memoize, 
  generateFastHash
} from './performance-cache';
import {
  isObject,
  isArray,
  isDate,
  isNotNullish
} from './type-guards';

// ====================
// 型定義
// ====================

type AnyObject = Record<string, unknown>;

// パフォーマンス測定用
interface ConversionMetrics {
  startTime: number;
  inputSize: number;
  cacheHit: boolean;
}

// 変換オプション
export interface ConversionOptions {
  useCache?: boolean;
  deep?: boolean;
  preserveDates?: boolean;
  maxDepth?: number;
}

const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  useCache: true,
  deep: true,
  preserveDates: true,
  maxDepth: 10
};

// ====================
// 最適化されたキー変換ヘルパー（メモ化）
// ====================

// キー変換結果をキャッシュするMap
const keyConversionCache = new Map<string, string>();

/**
 * snake_case文字列をcamelCaseに変換（メモ化版）
 * 例: "account_code" → "accountCode"
 */
function snakeToCamelKey(str: string): string {
  // キャッシュから確認
  let cached = keyConversionCache.get(`s2c:${str}`);
  if (cached !== undefined) {
    return cached;
  }
  
  // 変換実行
  cached = str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  
  // キャッシュに保存（最大1000エントリ）
  if (keyConversionCache.size < 1000) {
    keyConversionCache.set(`s2c:${str}`, cached);
  }
  
  return cached;
}

/**
 * camelCase文字列をsnake_caseに変換（メモ化版）
 * 例: "accountCode" → "account_code"
 */
function camelToSnakeKey(str: string): string {
  // キャッシュから確認
  let cached = keyConversionCache.get(`c2s:${str}`);
  if (cached !== undefined) {
    return cached;
  }
  
  // 変換実行
  cached = str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  
  // キャッシュに保存（最大1000エントリ）
  if (keyConversionCache.size < 1000) {
    keyConversionCache.set(`c2s:${str}`, cached);
  }
  
  return cached;
}

/**
 * キー変換キャッシュをクリア
 */
export function clearKeyCache(): void {
  keyConversionCache.clear();
}

// ====================
// メイン変換関数（最適化版）
// ====================

/**
 * snake_caseオブジェクトをcamelCaseに変換（最適化版）
 */
export function snakeToCamel<T = unknown>(
  obj: unknown, 
  options: ConversionOptions = {}
): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // キャッシュ使用時の処理
  if (opts.useCache && (isObject(obj) || isArray(obj))) {
    const cacheKey = generateFastHash(obj);
    return globalCacheManager.getCachedConversion(
      `snakeToCamel:${cacheKey}`,
      () => snakeToCamelInternal(obj, opts, 0)
    ) as T;
  }
  
  return snakeToCamelInternal(obj, opts, 0) as T;
}

/**
 * 内部変換関数（再帰処理）
 */
function snakeToCamelInternal(
  obj: unknown, 
  options: Required<ConversionOptions>,
  depth: number
): unknown {
  // 最大深度チェック
  if (depth > options.maxDepth) {
    console.warn(`[snakeToCamel] Maximum depth ${options.maxDepth} exceeded`);
    return obj;
  }
  
  // null/undefined チェック
  if (!isNotNullish(obj)) {
    return obj;
  }

  // プリミティブ値の場合はそのまま返す
  if (typeof obj !== "object") {
    return obj;
  }

  // 配列の場合は各要素を再帰的に変換
  if (isArray(obj)) {
    if (!options.deep) return obj;
    return obj.map((item) => snakeToCamelInternal(item, options, depth + 1));
  }

  // Dateオブジェクトの場合はそのまま返す
  if (isDate(obj)) {
    return options.preserveDates ? obj : obj.toISOString();
  }

  // オブジェクトの場合はキーを変換し、値を再帰的に変換
  const result: AnyObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamelKey(key);
    result[camelKey] = options.deep 
      ? snakeToCamelInternal(value, options, depth + 1)
      : value;
  }

  return result;
}

/**
 * camelCaseオブジェクトをsnake_caseに変換（最適化版）
 */
export function camelToSnake<T = unknown>(
  obj: unknown, 
  options: ConversionOptions = {}
): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // キャッシュ使用時の処理
  if (opts.useCache && (isObject(obj) || isArray(obj))) {
    const cacheKey = generateFastHash(obj);
    return globalCacheManager.getCachedConversion(
      `camelToSnake:${cacheKey}`,
      () => camelToSnakeInternal(obj, opts, 0)
    ) as T;
  }
  
  return camelToSnakeInternal(obj, opts, 0) as T;
}

/**
 * 内部変換関数（再帰処理）
 */
function camelToSnakeInternal(
  obj: unknown, 
  options: Required<ConversionOptions>,
  depth: number
): unknown {
  // 最大深度チェック
  if (depth > options.maxDepth) {
    console.warn(`[camelToSnake] Maximum depth ${options.maxDepth} exceeded`);
    return obj;
  }
  
  // null/undefined チェック
  if (!isNotNullish(obj)) {
    return obj;
  }

  // プリミティブ値の場合はそのまま返す
  if (typeof obj !== "object") {
    return obj;
  }

  // 配列の場合は各要素を再帰的に変換
  if (isArray(obj)) {
    if (!options.deep) return obj;
    return obj.map((item) => camelToSnakeInternal(item, options, depth + 1));
  }

  // Dateオブジェクトの場合は文字列に変換（Supabase互換性）
  if (isDate(obj)) {
    return obj.toISOString();
  }

  // オブジェクトの場合はキーを変換し、値を再帰的に変換
  const result: AnyObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnakeKey(key);
    result[snakeKey] = options.deep 
      ? camelToSnakeInternal(value, options, depth + 1)
      : value;
  }

  return result;
}

// ====================
// 高レベル変換関数（メモ化版）
// ====================

/**
 * 配列のキー変換（型安全・最適化版）
 */
export function convertArrayKeys<T, U>(
  array: T[],
  converter: (obj: T) => U,
  options: ConversionOptions = {}
): U[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!isArray(array)) {
    console.warn('[convertArrayKeys] Input is not an array');
    return [];
  }
  
  if (opts.useCache) {
    const cacheKey = `arrayConvert:${generateFastHash([array, converter.toString()])}`;
    return globalCacheManager.getCachedConversion(cacheKey, () => 
      array.map(converter)
    );
  }
  
  return array.map(converter);
}

/**
 * オプショナルなオブジェクトの変換（最適化版）
 */
export function convertOptional<T, U>(
  obj: T | null | undefined,
  converter: (obj: T) => U,
  options: ConversionOptions = {}
): U | null | undefined {
  if (!isNotNullish(obj)) {
    return null as U | null | undefined;
  }
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (opts.useCache && (isObject(obj) || isArray(obj))) {
    const cacheKey = `optionalConvert:${generateFastHash([obj, converter.toString()])}`;
    return globalCacheManager.getCachedConversion(cacheKey, () => 
      converter(obj)
    );
  }
  
  return converter(obj);
}

// ====================
// 最適化されたメモ化変換関数
// ====================

/**
 * メモ化されたsnakeToCamel変換関数
 */
export const memoizedSnakeToCamel = memoize(
  <T = unknown>(obj: unknown, options?: ConversionOptions): T => 
    snakeToCamel<T>(obj, options),
  (obj, options = {}) => `snakeToCamel:${generateFastHash([obj, options])}`
);

/**
 * メモ化されたcamelToSnake変換関数
 */
export const memoizedCamelToSnake = memoize(
  <T = unknown>(obj: unknown, options?: ConversionOptions): T => 
    camelToSnake<T>(obj, options),
  (obj, options = {}) => `camelToSnake:${generateFastHash([obj, options])}`
);

// ====================
// バッチ変換処理
// ====================

/**
 * 複数オブジェクトの一括snake→camel変換
 */
export function batchSnakeToCamel<T = unknown>(
  objects: unknown[],
  options: ConversionOptions = {}
): T[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!isArray(objects)) {
    console.warn('[batchSnakeToCamel] Input is not an array');
    return [];
  }
  
  if (opts.useCache) {
    const cacheKey = `batchSnakeToCamel:${generateFastHash([objects, options])}`;
    return globalCacheManager.getCachedConversion(cacheKey, () => 
      objects.map(obj => snakeToCamel<T>(obj, options))
    );
  }
  
  return objects.map(obj => snakeToCamel<T>(obj, options));
}

/**
 * 複数オブジェクトの一括camel→snake変換
 */
export function batchCamelToSnake<T = unknown>(
  objects: unknown[],
  options: ConversionOptions = {}
): T[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!isArray(objects)) {
    console.warn('[batchCamelToSnake] Input is not an array');
    return [];
  }
  
  if (opts.useCache) {
    const cacheKey = `batchCamelToSnake:${generateFastHash([objects, options])}`;
    return globalCacheManager.getCachedConversion(cacheKey, () => 
      objects.map(obj => camelToSnake<T>(obj, options))
    );
  }
  
  return objects.map(obj => camelToSnake<T>(obj, options));
}

// ====================
// パフォーマンス監視
// ====================

/**
 * 変換処理のパフォーマンス統計を取得
 */
export function getConversionStats() {
  return globalCacheManager.getStats();
}

/**
 * キャッシュをクリア
 */
export function clearConversionCache() {
  globalCacheManager.clearAll();
  clearKeyCache();
}

/**
 * パフォーマンス統計をログ出力
 */
export function logConversionStats() {
  if (process.env.NODE_ENV === 'development') {
    const stats = getConversionStats();
    console.group('[TypeConverter Performance Stats]');
    console.log('Performance:', stats.performance);
    console.log('String Cache:', stats.stringCache);
    console.log('Object Cache Access:', stats.objectCacheAccess);
    console.log('Key Cache Size:', keyConversionCache.size);
    console.groupEnd();
  }
}

// ====================
// 後方互換性のための元関数（非推奨）
// ====================

/**
 * @deprecated 新しいsnakeToCamel関数を使用してください
 */
export const legacySnakeToCamel = snakeToCamel;

/**
 * @deprecated 新しいcamelToSnake関数を使用してください
 */
export const legacyCamelToSnake = camelToSnake;

// ====================
// デフォルトエクスポート（便利な関数セット）
// ====================

const typeConverters = {
  snakeToCamel: memoizedSnakeToCamel,
  camelToSnake: memoizedCamelToSnake,
  batch: {
    snakeToCamel: batchSnakeToCamel,
    camelToSnake: batchCamelToSnake
  },
  performance: {
    getStats: getConversionStats,
    clearCache: clearConversionCache,
    logStats: logConversionStats
  }
};

export default typeConverters;

// 開発環境での自動統計ログ
if (process.env.NODE_ENV === 'development') {
  // 10秒ごとにパフォーマンス統計をログ出力
  setInterval(() => {
    const stats = getConversionStats();
    if (stats.performance.totalOperations > 0) {
      logConversionStats();
    }
  }, 10000);
}