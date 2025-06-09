/**
 * パフォーマンス最適化キャッシュシステム
 * ============================================================================
 * 型変換処理のメモ化とキャッシングによる高速化
 * 
 * 主要機能:
 * 1. LRUキャッシュによる変換結果保存
 * 2. WeakMapによるオブジェクト参照管理
 * 3. パフォーマンス統計の収集
 * 4. メモリリーク防止機能
 * ============================================================================
 */

// ====================
// LRUキャッシュ実装
// ====================

export class LRUCache<K, V> {
  private maxSize: number;
  private cache = new Map<K, V>();

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (least recently used)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  get maxCacheSize(): number {
    return this.maxSize;
  }

  // キャッシュ効率の統計を取得
  getStats(): CacheStats {
    return {
      size: this.size,
      maxSize: this.maxSize,
      utilizationRate: this.size / this.maxSize
    };
  }
}

// ====================
// パフォーマンス統計
// ====================

export interface CacheStats {
  size: number;
  maxSize: number;
  utilizationRate: number;
}

export interface PerformanceStats {
  cacheHits: number;
  cacheMisses: number;
  totalOperations: number;
  hitRate: number;
  averageConversionTime: number;
  totalConversionTime: number;
}

export class PerformanceTracker {
  private stats: PerformanceStats = {
    cacheHits: 0,
    cacheMisses: 0,
    totalOperations: 0,
    hitRate: 0,
    averageConversionTime: 0,
    totalConversionTime: 0
  };

  recordCacheHit(): void {
    this.stats.cacheHits++;
    this.stats.totalOperations++;
    this.updateHitRate();
  }

  recordCacheMiss(conversionTime: number): void {
    this.stats.cacheMisses++;
    this.stats.totalOperations++;
    this.stats.totalConversionTime += conversionTime;
    this.stats.averageConversionTime = 
      this.stats.totalConversionTime / this.stats.cacheMisses;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    this.stats.hitRate = 
      this.stats.totalOperations > 0 
        ? this.stats.cacheHits / this.stats.totalOperations 
        : 0;
  }

  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalOperations: 0,
      hitRate: 0,
      averageConversionTime: 0,
      totalConversionTime: 0
    };
  }

  logStats(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[TypeConverter Performance]', this.getStats());
    }
  }
}

// ====================
// キャッシュキー生成
// ====================

/**
 * オブジェクトのハッシュ値を生成（キャッシュキー用）
 */
export function generateCacheKey(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  if (typeof obj !== 'object') {
    return String(obj);
  }

  // 配列の場合
  if (Array.isArray(obj)) {
    return `[${obj.map(generateCacheKey).join(',')}]`;
  }

  // オブジェクトの場合（キーをソートして一意性を保証）
  const sortedKeys = Object.keys(obj).sort();
  const keyValuePairs = sortedKeys.map(key => 
    `${key}:${generateCacheKey((obj as Record<string, unknown>)[key])}`
  );
  
  return `{${keyValuePairs.join(',')}}`;
}

/**
 * より高速なハッシュ生成（大きなオブジェクト用）
 */
export function generateFastHash(obj: unknown): string {
  const jsonStr = JSON.stringify(obj, Object.keys(obj || {}).sort());
  
  // 簡単なハッシュ関数（djb2アルゴリズム）
  let hash = 5381;
  for (let i = 0; i < jsonStr.length; i++) {
    hash = ((hash << 5) + hash) + jsonStr.charCodeAt(i);
    hash = hash & hash; // 32bit整数に変換
  }
  
  return hash.toString(36);
}

// ====================
// メモリ管理
// ====================

/**
 * WeakMapベースのオブジェクトキャッシュ
 * ガベージコレクションによる自動クリーンアップ
 */
export class WeakObjectCache<T extends object, V> {
  private cache = new WeakMap<T, V>();
  private accessCount = 0;

  get(key: T): V | undefined {
    this.accessCount++;
    return this.cache.get(key);
  }

  set(key: T, value: V): void {
    this.cache.set(key, value);
  }

  has(key: T): boolean {
    return this.cache.has(key);
  }

  getAccessCount(): number {
    return this.accessCount;
  }

  resetAccessCount(): void {
    this.accessCount = 0;
  }
}

// ====================
// キャッシュマネージャー
// ====================

export class CacheManager {
  private stringCache: LRUCache<string, unknown>;
  private objectCache: WeakObjectCache<object, unknown>;
  private performanceTracker: PerformanceTracker;

  constructor(maxStringCacheSize: number = 1000) {
    this.stringCache = new LRUCache(maxStringCacheSize);
    this.objectCache = new WeakObjectCache();
    this.performanceTracker = new PerformanceTracker();
  }

  getCachedConversion<T>(
    key: string | object,
    conversionFn: () => T
  ): T {
    const startTime = performance.now();

    // オブジェクトキー の場合
    if (typeof key === 'object' && key !== null) {
      const cached = this.objectCache.get(key);
      if (cached !== undefined) {
        this.performanceTracker.recordCacheHit();
        return cached as T;
      }

      const result = conversionFn();
      this.objectCache.set(key, result);
      
      const conversionTime = performance.now() - startTime;
      this.performanceTracker.recordCacheMiss(conversionTime);
      
      return result;
    }

    // 文字列キーの場合
    const stringKey = typeof key === 'string' ? key : generateFastHash(key);
    const cached = this.stringCache.get(stringKey);
    
    if (cached !== undefined) {
      this.performanceTracker.recordCacheHit();
      return cached as T;
    }

    const result = conversionFn();
    this.stringCache.set(stringKey, result);
    
    const conversionTime = performance.now() - startTime;
    this.performanceTracker.recordCacheMiss(conversionTime);
    
    return result;
  }

  getStats(): {
    performance: PerformanceStats;
    stringCache: CacheStats;
    objectCacheAccess: number;
  } {
    return {
      performance: this.performanceTracker.getStats(),
      stringCache: this.stringCache.getStats(),
      objectCacheAccess: this.objectCache.getAccessCount()
    };
  }

  clearAll(): void {
    this.stringCache.clear();
    this.performanceTracker.reset();
    this.objectCache.resetAccessCount();
  }

  logStats(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CacheManager Stats]', this.getStats());
    }
  }
}

// ====================
// シングルトンインスタンス
// ====================

export const globalCacheManager = new CacheManager();

// 開発環境でのデバッグ用
if (process.env.NODE_ENV === 'development') {
  // 5秒ごとにキャッシュ統計をログ出力
  setInterval(() => {
    globalCacheManager.logStats();
  }, 5000);
}

// ====================
// 型定義
// ====================

export type CacheableFunction<T extends unknown[], R> = (...args: T) => R;
export type MemoizedFunction<T extends unknown[], R> = CacheableFunction<T, R> & {
  cache: CacheManager;
  clearCache: () => void;
};

// ====================
// メモ化デコレータ
// ====================

/**
 * 関数をメモ化する
 */
export function memoize<T extends unknown[], R>(
  fn: CacheableFunction<T, R>,
  keyGenerator?: (...args: T) => string
): MemoizedFunction<T, R> {
  const cache = new CacheManager();

  const memoized = ((...args: T): R => {
    const key = keyGenerator 
      ? keyGenerator(...args)
      : generateFastHash(args);

    return cache.getCachedConversion(key, () => fn(...args));
  }) as MemoizedFunction<T, R>;

  memoized.cache = cache;
  memoized.clearCache = () => cache.clearAll();

  return memoized;
}

// ====================
// ユーティリティ関数
// ====================

/**
 * キャッシュ効率を測定
 */
export function measureCacheEfficiency<T>(
  cacheFn: () => T,
  directFn: () => T,
  iterations: number = 1000
): {
  cacheTime: number;
  directTime: number;
  speedup: number;
} {
  // ウォームアップ
  cacheFn();
  directFn();

  // キャッシュ実行時間測定
  const cacheStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    cacheFn();
  }
  const cacheTime = performance.now() - cacheStart;

  // 直接実行時間測定
  const directStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    directFn();
  }
  const directTime = performance.now() - directStart;

  return {
    cacheTime,
    directTime,
    speedup: directTime / cacheTime
  };
}