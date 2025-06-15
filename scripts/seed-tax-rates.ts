/**
 * 税区分マスタの初期データ投入スクリプト
 */

import { prisma } from "@/lib/database/prisma";

const TAX_RATES_DATA = [
  {
    taxCode: "TAX10",
    taxName: "消費税10%",
    taxRate: 10.00,
    sortOrder: 1,
    isActive: true,
  },
  {
    taxCode: "TAX8",
    taxName: "消費税8%（軽減税率）",
    taxRate: 8.00,
    sortOrder: 2,
    isActive: true,
  },
  {
    taxCode: "TAX0",
    taxName: "非課税・免税",
    taxRate: 0.00,
    sortOrder: 3,
    isActive: true,
  },
  {
    taxCode: "TAXFREE",
    taxName: "税抜処理用",
    taxRate: 0.00,
    sortOrder: 4,
    isActive: true,
  },
];

async function seedTaxRates() {
  console.log("税区分マスタの初期データを投入します...");

  try {
    // 既存データを削除（開発環境のみ）
    await prisma.taxRate.deleteMany({});
    console.log("既存の税区分データを削除しました");

    // 新しいデータを投入
    for (const taxRate of TAX_RATES_DATA) {
      await prisma.taxRate.create({
        data: taxRate,
      });
      console.log(`税区分 ${taxRate.taxCode} - ${taxRate.taxName} を作成しました`);
    }

    console.log("税区分マスタの初期データ投入が完了しました");
  } catch (error) {
    console.error("税区分マスタの初期データ投入に失敗しました:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  seedTaxRates()
    .then(() => {
      console.log("スクリプト実行完了");
      process.exit(0);
    })
    .catch((error) => {
      console.error("スクリプト実行エラー:", error);
      process.exit(1);
    });
}

export { seedTaxRates };