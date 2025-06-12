/**
 * マスタデータ投入スクリプト（消費税対応）
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('マスタデータの投入を開始します...');

  // 勘定科目マスタ
  console.log('勘定科目マスタを投入中...');
  await prisma.account.createMany({
    data: [
      // 資産
      { accountCode: '1110', accountName: '現金', accountType: '流動資産', taxCategory: 'none', isTaxAccount: false },
      { accountCode: '1210', accountName: '普通預金', accountType: '流動資産', taxCategory: 'none', isTaxAccount: false },
      { accountCode: '1310', accountName: '売掛金', accountType: '流動資産', taxCategory: 'none', isTaxAccount: false },
      { accountCode: '1355', accountName: '仮払消費税', accountType: '流動資産', taxCategory: 'deductible_tax', isTaxAccount: true },

      // 負債
      { accountCode: '2110', accountName: '買掛金', accountType: '流動負債', taxCategory: 'none', isTaxAccount: false },
      { accountCode: '2250', accountName: '仮受消費税', accountType: '流動負債', taxCategory: 'payable_tax', isTaxAccount: true },

      // 収益
      { accountCode: '4110', accountName: '売上高', accountType: '売上', taxCategory: 'none', isTaxAccount: false, defaultTaxRate: 10.00 },
      { accountCode: '4120', accountName: '受取利息', accountType: 'その他売上', taxCategory: 'none', isTaxAccount: false },

      // 費用
      { accountCode: '5110', accountName: '仕入高', accountType: '売上原価', taxCategory: 'none', isTaxAccount: false, defaultTaxRate: 10.00 },
      { accountCode: '5210', accountName: '旅費交通費', accountType: '販売費及び一般管理費', taxCategory: 'none', isTaxAccount: false, defaultTaxRate: 10.00 },
      { accountCode: '5220', accountName: '通信費', accountType: '販売費及び一般管理費', taxCategory: 'none', isTaxAccount: false, defaultTaxRate: 10.00 },
      { accountCode: '5230', accountName: '消耗品費', accountType: '販売費及び一般管理費', taxCategory: 'none', isTaxAccount: false, defaultTaxRate: 10.00 },
    ],
    skipDuplicates: true,
  });

  // 取引先マスタ
  console.log('取引先マスタを投入中...');
  await prisma.partner.createMany({
    data: [
      { partnerCode: 'C001', partnerName: 'サンプル得意先A', partnerType: 'customer' },
      { partnerCode: 'C002', partnerName: 'サンプル得意先B', partnerType: 'customer' },
      { partnerCode: 'V001', partnerName: 'サンプル仕入先A', partnerType: 'vendor' },
      { partnerCode: 'V002', partnerName: 'サンプル仕入先B', partnerType: 'vendor' },
      { partnerCode: 'B001', partnerName: 'メイン銀行', partnerType: 'bank' },
    ],
    skipDuplicates: true,
  });

  // 分析コードマスタ
  console.log('分析コードマスタを投入中...');
  await prisma.analysisCode.createMany({
    data: [
      { analysisCode: 'D001', analysisName: '営業部', analysisType: 'department' },
      { analysisCode: 'D002', analysisName: '総務部', analysisType: 'department' },
      { analysisCode: 'P001', analysisName: 'プロジェクトA', analysisType: 'project' },
      { analysisCode: 'P002', analysisName: 'プロジェクトB', analysisType: 'project' },
    ],
    skipDuplicates: true,
  });

  console.log('マスタデータの投入が完了しました！');

  // 投入結果の確認
  const accountCount = await prisma.account.count();
  const partnerCount = await prisma.partner.count();
  const analysisCodeCount = await prisma.analysisCode.count();

  console.log(`投入結果:`);
  console.log(`- 勘定科目: ${accountCount}件`);
  console.log(`- 取引先: ${partnerCount}件`);
  console.log(`- 分析コード: ${analysisCodeCount}件`);

  // 消費税科目の確認
  const taxAccounts = await prisma.account.findMany({
    where: { isTaxAccount: true },
    select: { accountCode: true, accountName: true, taxCategory: true },
  });
  console.log(`消費税科目:`);
  taxAccounts.forEach(acc => {
    console.log(`- ${acc.accountCode}: ${acc.accountName} (${acc.taxCategory})`);
  });
}

main()
  .catch((e) => {
    console.error('エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });