/**
 * 型変換パフォーマンステスト
 * ============================================================================
 * 最適化された型変換システムのパフォーマンス検証とベンチマーク
 * ============================================================================
 */

import {
  snakeToCamel,
  camelToSnake,
  memoizedSnakeToCamel,
  memoizedCamelToSnake,
  batchSnakeToCamel,
  batchCamelToSnake,
  getConversionStats,
  clearConversionCache,
  type ConversionOptions
} from '../../lib/utils/typeConverters';
import { measureCacheEfficiency } from '../../lib/utils/performance-cache';

describe('TypeConverter Performance Tests', () => {
  beforeEach(() => {
    clearConversionCache();
  });

  // テストデータ生成
  const createTestData = (size: number) => {
    const accounts = [];
    for (let i = 0; i < size; i++) {
      accounts.push({
        account_code: `ACC${i.toString().padStart(4, '0')}`,
        account_name: `テスト勘定科目${i}`,
        account_type: i % 2 === 0 ? '資産' : '負債',
        is_active: true,
        sort_order: i,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sub_accounts: [
          {
            sub_account_code: `SUB${i}01`,
            sub_account_name: `テスト補助科目${i}-1`,
            is_active: true
          },
          {
            sub_account_code: `SUB${i}02`,
            sub_account_name: `テスト補助科目${i}-2`,
            is_active: true
          }
        ]
      });
    }
    return accounts;
  };

  const createLargeNestedData = () => ({
    journal_header: {
      journal_number: '202501060001001',
      journal_date: '2025-01-06',
      description: 'テスト仕訳',
      created_at: new Date().toISOString(),
      journal_details: Array.from({ length: 100 }, (_, i) => ({
        line_number: i + 1,
        debit_credit: i % 2 === 0 ? 'D' : 'C',
        account_code: `ACC${i.toString().padStart(4, '0')}`,
        amount: Math.floor(Math.random() * 1000000),
        line_description: `明細${i + 1}`,
        partner: {
          partner_code: `PART${i.toString().padStart(3, '0')}`,
          partner_name: `取引先${i + 1}`,
          partner_type: '得意先'
        }
      }))
    }
  });

  describe('Basic Conversion Performance', () => {
    test('小データセット変換パフォーマンス (10件)', () => {
      const testData = createTestData(10);
      
      const start = performance.now();
      const converted = snakeToCamel(testData);
      const end = performance.now();
      
      expect(converted).toBeDefined();
      expect(end - start).toBeLessThan(10); // 10ms以下
    });

    test('中データセット変換パフォーマンス (100件)', () => {
      const testData = createTestData(100);
      
      const start = performance.now();
      const converted = snakeToCamel(testData);
      const end = performance.now();
      
      expect(converted).toBeDefined();
      expect(end - start).toBeLessThan(50); // 50ms以下
    });

    test('大データセット変換パフォーマンス (1000件)', () => {
      const testData = createTestData(1000);
      
      const start = performance.now();
      const converted = snakeToCamel(testData);
      const end = performance.now();
      
      expect(converted).toBeDefined();
      expect(end - start).toBeLessThan(200); // 200ms以下
    });
  });

  describe('Cache Performance Tests', () => {
    test('メモ化によるパフォーマンス向上を検証', () => {
      const testData = createTestData(100);
      
      // 最初の実行（キャッシュなし）
      const firstStart = performance.now();
      const firstResult = memoizedSnakeToCamel(testData);
      const firstEnd = performance.now();
      const firstTime = firstEnd - firstStart;
      
      // 2回目の実行（キャッシュあり）
      const secondStart = performance.now();
      const secondResult = memoizedSnakeToCamel(testData);
      const secondEnd = performance.now();
      const secondTime = secondEnd - secondStart;
      
      expect(firstResult).toEqual(secondResult);
      expect(secondTime).toBeLessThan(firstTime * 0.5); // 50%以上の高速化
      
      // 統計確認
      const stats = getConversionStats();
      expect(stats.performance.cacheHits).toBeGreaterThan(0);
      expect(stats.performance.hitRate).toBeGreaterThan(0);
    });

    test('バッチ処理のパフォーマンス効率', () => {
      const testDataArray = Array.from({ length: 50 }, () => createTestData(10));
      
      // 個別変換
      const individualStart = performance.now();
      const individualResults = testDataArray.map(data => snakeToCamel(data));
      const individualEnd = performance.now();
      const individualTime = individualEnd - individualStart;
      
      // バッチ変換
      clearConversionCache();
      const batchStart = performance.now();
      const batchResults = batchSnakeToCamel(testDataArray);
      const batchEnd = performance.now();
      const batchTime = batchEnd - batchStart;
      
      expect(batchResults).toEqual(individualResults);
      // バッチ処理は最低でも同等以上の性能を期待
      expect(batchTime).toBeLessThanOrEqual(individualTime * 1.2);
    });
  });

  describe('Memory Usage Tests', () => {
    test('大量データ処理でのメモリ効率', () => {
      const testData = createTestData(500);
      
      // メモリ使用量の概算測定
      const initialHeap = process.memoryUsage().heapUsed;
      
      // 変換実行
      const converted = snakeToCamel(testData);
      
      const afterConversion = process.memoryUsage().heapUsed;
      const memoryIncrease = afterConversion - initialHeap;
      
      expect(converted).toBeDefined();
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以下
    });

    test('キャッシュサイズ制限の動作確認', () => {
      // 大量の異なるデータでキャッシュを満杯にする
      for (let i = 0; i < 1200; i++) {
        const uniqueData = { test_value: i, random: Math.random() };
        memoizedSnakeToCamel(uniqueData);
      }
      
      const stats = getConversionStats();
      // キャッシュサイズが上限を超えないことを確認
      expect(stats.stringCache.size).toBeLessThanOrEqual(stats.stringCache.maxSize);
    });
  });

  describe('Deep Nesting Performance', () => {
    test('深いネスト構造での変換パフォーマンス', () => {
      const deepData = createLargeNestedData();
      
      const start = performance.now();
      const converted = snakeToCamel(deepData);
      const end = performance.now();
      
      expect(converted).toBeDefined();
      expect(end - start).toBeLessThan(100); // 100ms以下
      
      // 構造の検証
      expect(converted.journalHeader).toBeDefined();
      expect(converted.journalHeader.journalDetails).toHaveLength(100);
      expect(converted.journalHeader.journalDetails[0].partner).toBeDefined();
    });

    test('最大深度制限の動作確認', () => {
      const options: ConversionOptions = {
        useCache: false,
        deep: true,
        preserveDates: true,
        maxDepth: 3
      };
      
      const deepData = createLargeNestedData();
      
      const start = performance.now();
      const converted = snakeToCamel(deepData, options);
      const end = performance.now();
      
      expect(converted).toBeDefined();
      expect(end - start).toBeLessThan(50); // 50ms以下（制限により高速）
    });
  });

  describe('Cache Efficiency Measurement', () => {
    test('キャッシュ効率の自動測定', () => {
      const testData = createTestData(50);
      
      const efficiency = measureCacheEfficiency(
        () => memoizedSnakeToCamel(testData),
        () => snakeToCamel(testData, { useCache: false }),
        100 // 100回実行
      );
      
      expect(efficiency.speedup).toBeGreaterThan(1); // キャッシュの方が高速
      expect(efficiency.cacheTime).toBeLessThan(efficiency.directTime);
      
      console.log('Cache Efficiency Results:', efficiency);
    });
  });

  describe('Real-world Scenario Tests', () => {
    test('勘定科目一覧表示シナリオ', () => {
      // 実際の勘定科目一覧表示を想定
      const accounts = createTestData(200);
      
      const start = performance.now();
      
      // 1. Server Actionからのデータ取得を想定（camelCase）
      const camelCaseData = snakeToCamel(accounts);
      
      // 2. UIでの表示用にsnake_caseに変換
      const snakeCaseData = batchCamelToSnake(camelCaseData);
      
      const end = performance.now();
      
      expect(snakeCaseData).toHaveLength(200);
      expect(end - start).toBeLessThan(100); // 100ms以下
    });

    test('仕訳入力フォームシナリオ', () => {
      // 仕訳入力フォームでの頻繁な変換を想定
      const journalData = createLargeNestedData();
      
      const start = performance.now();
      
      // フォーム入力時の変換（snake_case → camelCase）
      for (let i = 0; i < 10; i++) {
        const camelData = memoizedSnakeToCamel(journalData);
        // フォーム送信時の変換（camelCase → snake_case）
        const snakeData = memoizedCamelToSnake(camelData);
        expect(snakeData).toBeDefined();
      }
      
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // 50ms以下（メモ化効果）
      
      const stats = getConversionStats();
      expect(stats.performance.hitRate).toBeGreaterThan(0.8); // 80%以上のヒット率
    });
  });

  describe('Stress Tests', () => {
    test('極大データセットの処理', () => {
      const massiveData = createTestData(5000);
      
      const start = performance.now();
      const converted = snakeToCamel(massiveData);
      const end = performance.now();
      
      expect(converted).toBeDefined();
      expect(converted).toHaveLength(5000);
      expect(end - start).toBeLessThan(1000); // 1秒以下
    });

    test('並行処理ストレステスト', async () => {
      const testData = createTestData(100);
      
      // 10個の並行変換処理
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(memoizedSnakeToCamel(testData))
      );
      
      const start = performance.now();
      const results = await Promise.all(promises);
      const end = performance.now();
      
      expect(results).toHaveLength(10);
      expect(results.every(result => result.length === 100)).toBe(true);
      expect(end - start).toBeLessThan(100); // 100ms以下
    });
  });

  afterAll(() => {
    // テスト完了後の統計レポート
    const finalStats = getConversionStats();
    console.log('\n=== Type Conversion Performance Report ===');
    console.log('Total Operations:', finalStats.performance.totalOperations);
    console.log('Cache Hit Rate:', `${(finalStats.performance.hitRate * 100).toFixed(2)}%`);
    console.log('Average Conversion Time:', `${finalStats.performance.averageConversionTime.toFixed(3)}ms`);
    console.log('Cache Utilization:', `${(finalStats.stringCache.utilizationRate * 100).toFixed(2)}%`);
    console.log('=========================================\n');
  });
});