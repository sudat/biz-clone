#!/usr/bin/env ts-node

/**
 * ダミー仕訳データ投入スクリプト
 *
 * 使い方:
 *   bunx ts-node scripts/seed-sample-journals.ts [count]
 *   # もしくは
 *   npx ts-node scripts/seed-sample-journals.ts 1000
 *
 * Prisma のシード設定に組み込む場合は package.json の "prisma.seed" に
 *   "ts-node scripts/seed-sample-journals.ts"
 * を追加してください。
 */

import { generateSampleJournals } from "@/lib/utils/sample-journal-generator";

async function main() {
  const arg = process.argv[2];
  const count = arg ? Number(arg) : 1000;
  if (!Number.isFinite(count) || count <= 0) {
    console.error("生成件数は正の整数で指定してください。");
    process.exit(1);
  }

  console.log(`ダミー仕訳を ${count} 件生成します...`);
  await generateSampleJournals(count);
  console.log("✔ ダミー仕訳生成が完了しました！");
}

main().catch((e) => {
  console.error("エラーが発生しました:", e);
  process.exit(1);
});
