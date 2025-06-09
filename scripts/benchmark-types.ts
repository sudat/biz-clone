#!/usr/bin/env bun

/**
 * 型変換システムベンチマークスクリプト
 * ============================================================================
 * パフォーマンス最適化前後の比較とベンチマーク実行
 * 
 * 使用方法:
 * bun run scripts/benchmark-types.ts
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
} from '../lib/utils/typeConverters';
import { measureCacheEfficiency } from '../lib/utils/performance-cache';

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color: keyof typeof colors, message: string): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テストデータ生成
function generateTestData(size: number, complexity: 'simple' | 'complex' | 'deep' = 'simple') {
  const baseAccount = (i: number) => ({
    account_code: `ACC${i.toString().padStart(4, '0')}`,
    account_name: `テスト勘定科目${i}`,
    account_name_kana: `テストカンジョウカモク${i}`,
    account_type: ['資産', '負債', '資本', '収益', '費用'][i % 5],
    parent_account_code: i > 10 ? `ACC${(i - 10).toString().padStart(4, '0')}` : null,
    is_detail: i % 3 === 0,
    is_active: i % 10 !== 0,
    sort_order: i,
    notes: `備考テキスト${i}`.repeat(complexity === 'complex' ? 3 : 1),
    created_at: new Date(Date.now() - i * 1000 * 60).toISOString(),
    updated_at: new Date().toISOString()
  });

  if (complexity === 'simple') {
    return Array.from({ length: size }, (_, i) => baseAccount(i));
  }

  if (complexity === 'complex') {
    return Array.from({ length: size }, (_, i) => ({
      ...baseAccount(i),
      sub_accounts: Array.from({ length: 3 }, (_, j) => ({
        sub_account_code: `SUB${i}${j.toString().padStart(2, '0')}`,
        sub_account_name: `補助科目${i}-${j}`,
        sub_account_name_kana: `ホジョカモク${i}-${j}`,
        is_active: true,
        sort_order: j,
        notes: `補助科目備考${i}-${j}`
      })),
      related_partners: Array.from({ length: 2 }, (_, k) => ({
        partner_code: `PART${i}${k}`,
        partner_name: `取引先${i}-${k}`,
        partner_type: k === 0 ? '得意先' : '仕入先'
      }))
    }));
  }

  // Deep nesting
  return {
    master_data: Array.from({ length: size }, (_, i) => baseAccount(i)),
    journal_data: Array.from({ length: size / 10 }, (_, i) => ({
      journal_number: `202501${i.toString().padStart(8, '0')}`,
      journal_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: `仕訳${i}`,
      details: Array.from({ length: 4 }, (_, j) => ({
        line_number: j + 1,
        debit_credit: j % 2 === 0 ? 'D' : 'C',
        account_code: `ACC${((i * 4 + j) % size).toString().padStart(4, '0')}`,
        amount: Math.floor(Math.random() * 1000000),
        line_description: `明細${j + 1}`,
        partner: j % 2 === 0 ? {
          partner_code: `PART${i}`,
          partner_name: `取引先${i}`
        } : null
      }))
    }))
  };
}

// ベンチマーク実行関数
async function runBenchmark(
  name: string, 
  fn: () => any, 
  iterations: number = 1000
): Promise<{ 
  name: string; 
  avgTime: number; 
  totalTime: number; 
  memoryUsed: number;
  iterations: number;
}> {
  // ウォームアップ
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // ガベージコレクション
  if (global.gc) {
    global.gc();
  }

  const initialMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const endTime = performance.now();
  const finalMemory = process.memoryUsage().heapUsed;

  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const memoryUsed = finalMemory - initialMemory;

  return {
    name,
    avgTime,
    totalTime,
    memoryUsed,
    iterations
  };
}

// 比較ベンチマーク
async function runComparisonBenchmark() {
  log('cyan', '\n=== 型変換システム パフォーマンスベンチマーク ===\n');

  const testSizes = [10, 100, 1000];
  const complexities: Array<'simple' | 'complex' | 'deep'> = ['simple', 'complex', 'deep'];

  for (const complexity of complexities) {
    log('magenta', `\n--- ${complexity.toUpperCase()} データ構造テスト ---`);

    for (const size of testSizes) {
      log('yellow', `\nデータサイズ: ${size}件`);
      
      const testData = generateTestData(size, complexity);
      
      // 各種変換方法のベンチマーク
      const benchmarks = [
        {
          name: '標準 snake→camel',
          fn: () => snakeToCamel(testData, { useCache: false })
        },
        {
          name: 'メモ化 snake→camel',
          fn: () => memoizedSnakeToCamel(testData)
        },
        {
          name: '標準 camel→snake',
          fn: () => camelToSnake(testData, { useCache: false })
        },
        {
          name: 'メモ化 camel→snake',
          fn: () => memoizedCamelToSnake(testData)
        }
      ];

      if (Array.isArray(testData)) {
        benchmarks.push(
          {
            name: 'バッチ snake→camel',
            fn: () => batchSnakeToCamel(testData)
          },
          {
            name: 'バッチ camel→snake',
            fn: () => batchCamelToSnake(testData)
          }
        );
      }

      // ベンチマーク実行
      const results = [];
      for (const benchmark of benchmarks) {
        clearConversionCache();
        const result = await runBenchmark(benchmark.name, benchmark.fn, 100);
        results.push(result);
      }

      // 結果表示
      console.log('\n| 変換方法 | 平均時間(ms) | 合計時間(ms) | メモリ使用量(KB) |');
      console.log('|----------|-------------|-------------|-----------------|');
      
      results.forEach(result => {
        const memoryKB = (result.memoryUsed / 1024).toFixed(1);
        console.log(
          `| ${result.name.padEnd(12)} | ${result.avgTime.toFixed(3).padStart(11)} | ${result.totalTime.toFixed(1).padStart(11)} | ${memoryKB.padStart(15)} |`
        );
      });

      // パフォーマンス分析
      const standardSnakeToCamel = results.find(r => r.name.includes('標準 snake→camel'));
      const memoizedSnakeToCamel = results.find(r => r.name.includes('メモ化 snake→camel'));
      
      if (standardSnakeToCamel && memoizedSnakeToCamel) {
        const speedup = standardSnakeToCamel.avgTime / memoizedSnakeToCamel.avgTime;
        const color = speedup > 1.5 ? 'green' : speedup > 1.1 ? 'yellow' : 'red';
        log(color, `メモ化による高速化: ${speedup.toFixed(2)}x`);
      }
    }
  }
}

// キャッシュ効率ベンチマーク
async function runCacheEfficiencyBenchmark() {
  log('cyan', '\n=== キャッシュ効率ベンチマーク ===\n');

  const testData = generateTestData(100, 'complex');
  
  // キャッシュ効率測定
  const efficiency = measureCacheEfficiency(
    () => memoizedSnakeToCamel(testData),
    () => snakeToCamel(testData, { useCache: false }),
    1000
  );

  console.log('キャッシュ効率結果:');
  console.log(`- キャッシュ使用時間: ${efficiency.cacheTime.toFixed(2)}ms`);
  console.log(`- 直接実行時間: ${efficiency.directTime.toFixed(2)}ms`);
  console.log(`- 高速化倍率: ${efficiency.speedup.toFixed(2)}x`);

  const stats = getConversionStats();
  console.log('\nキャッシュ統計:');
  console.log(`- ヒット率: ${(stats.performance.hitRate * 100).toFixed(2)}%`);
  console.log(`- 総実行回数: ${stats.performance.totalOperations}`);
  console.log(`- キャッシュサイズ: ${stats.stringCache.size}/${stats.stringCache.maxSize}`);
  console.log(`- 利用率: ${(stats.stringCache.utilizationRate * 100).toFixed(2)}%`);
}

// メモリリークテスト
async function runMemoryLeakTest() {
  log('cyan', '\n=== メモリリークテスト ===\n');

  const initialMemory = process.memoryUsage().heapUsed;
  
  // 大量の異なるデータで変換実行
  for (let i = 0; i < 1000; i++) {
    const testData = generateTestData(50, 'simple');
    // データを少し変更して異なるキャッシュエントリを作成
    testData[0].account_name = `テスト${i}`;
    memoizedSnakeToCamel(testData);
  }

  // ガベージコレクション強制実行
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

  console.log(`初期メモリ使用量: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
  console.log(`最終メモリ使用量: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
  console.log(`メモリ増加量: ${memoryIncreaseMB.toFixed(2)}MB`);

  const color = memoryIncreaseMB < 10 ? 'green' : memoryIncreaseMB < 50 ? 'yellow' : 'red';
  log(color, `メモリリーク評価: ${memoryIncreaseMB < 10 ? '良好' : memoryIncreaseMB < 50 ? '注意' : '要改善'}`);
}

// 実世界シナリオベンチマーク
async function runRealWorldScenario() {
  log('cyan', '\n=== 実世界シナリオベンチマーク ===\n');

  // シナリオ1: 勘定科目一覧画面
  log('yellow', 'シナリオ1: 勘定科目一覧画面 (200件表示)');
  const accountsData = generateTestData(200, 'complex');
  
  const scenario1 = await runBenchmark(
    '勘定科目一覧変換',
    () => {
      // Server Actionからデータ取得→UI表示の流れを模擬
      const camelData = snakeToCamel(accountsData);
      return batchCamelToSnake(camelData);
    },
    50
  );

  console.log(`勘定科目一覧変換: ${scenario1.avgTime.toFixed(3)}ms/回`);

  // シナリオ2: 仕訳入力フォーム
  log('yellow', 'シナリオ2: 仕訳入力フォーム (頻繁な変換)');
  const journalData = generateTestData(1, 'deep');
  
  const scenario2 = await runBenchmark(
    '仕訳フォーム変換',
    () => {
      // フォーム入力時の双方向変換を模擬
      const camelData = memoizedSnakeToCamel(journalData);
      return memoizedCamelToSnake(camelData);
    },
    200
  );

  console.log(`仕訳フォーム変換: ${scenario2.avgTime.toFixed(3)}ms/回`);

  const stats = getConversionStats();
  log('green', `フォームシナリオのヒット率: ${(stats.performance.hitRate * 100).toFixed(2)}%`);
}

// メイン実行
async function main() {
  const startTime = Date.now();
  
  try {
    await runComparisonBenchmark();
    await runCacheEfficiencyBenchmark();
    await runMemoryLeakTest();
    await runRealWorldScenario();
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    log('green', `\n=== ベンチマーク完了 ===`);
    log('green', `総実行時間: ${(totalTime / 1000).toFixed(2)}秒`);
    log('green', `==================\n`);
    
  } catch (error) {
    log('red', `ベンチマーク実行エラー: ${error}`);
    process.exit(1);
  }
}

// スクリプト実行
if (import.meta.main) {
  main();
}