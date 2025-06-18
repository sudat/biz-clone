#!/usr/bin/env ts-node

/**
 * ダミー仕訳データ投入スクリプト
 *
 * 使い方:
 *   bunx ts-node scripts/seed-sample-journals.ts [count] [--clear]
 *   # もしくは
 *   npx ts-node scripts/seed-sample-journals.ts 20 --clear
 *
 * オプション:
 *   --clear: 既存の仕訳データをクリアしてから新規データを生成
 *
 * Prisma のシード設定に組み込む場合は package.json の "prisma.seed" に
 *   "ts-node scripts/seed-sample-journals.ts"
 * を追加してください。
 */

import { generateSampleJournals } from "@/lib/utils/sample-journal-generator";

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find((arg) => !arg.startsWith("--"));
  const shouldClear = args.includes("--clear");

  const count = countArg ? Number(countArg) : 20; // デフォルトを20件に変更

  if (!Number.isFinite(count) || count <= 0) {
    console.error("生成件数は正の整数で指定してください。");
    process.exit(1);
  }

  console.log(
    `${
      shouldClear ? "既存データをクリアして" : ""
    }ダミー仕訳を ${count} 件生成します...`,
  );
  console.log("仕訳番号形式: YYYYMMDD + 6桁連番（000001から開始）");

  await generateSampleJournals(count, shouldClear);
  console.log("✔ ダミー仕訳生成が完了しました！");
}

main().catch((e) => {
  console.error("エラーが発生しました:", e);
  process.exit(1);
});
