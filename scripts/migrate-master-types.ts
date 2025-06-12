/**
 * マスタデータ区分値移行スクリプト
 * ============================================================================
 * 既存データの区分値を新しい統一型定義に合わせて移行
 * ============================================================================
 */

import { prisma } from "@/lib/database/prisma";
import { ACCOUNT_TYPES, PARTNER_TYPES, isValidAccountType, isValidPartnerType } from "@/types/master-types";

interface MigrationResult {
  accountsUpdated: number;
  partnersUpdated: number;
  errors: string[];
}

async function migrateAccountTypes(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // 「資本」→「純資産」の移行
    const capitalAccounts = await prisma.account.findMany({
      where: { accountType: "資本" }
    });

    console.log(`Found ${capitalAccounts.length} accounts with type "資本"`);

    for (const account of capitalAccounts) {
      try {
        await prisma.account.update({
          where: { accountCode: account.accountCode },
          data: { accountType: ACCOUNT_TYPES.EQUITY } // "純資産"
        });
        updated++;
        console.log(`Updated account ${account.accountCode} (${account.accountName}): 資本 → 純資産`);
      } catch (error) {
        const errorMsg = `Failed to update account ${account.accountCode}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // 他の型定義も確認（想定外の値がないかチェック）
    const allAccounts = await prisma.account.findMany({
      select: { accountCode: true, accountName: true, accountType: true }
    });

    const invalidAccounts = allAccounts.filter(account => !isValidAccountType(account.accountType));

    if (invalidAccounts.length > 0) {
      console.warn("⚠️ Invalid account types found:");
      invalidAccounts.forEach(account => {
        console.warn(`  ${account.accountCode} (${account.accountName}): "${account.accountType}"`);
        errors.push(`Invalid account type: ${account.accountCode} has "${account.accountType}"`);
      });
    }

  } catch (error) {
    const errorMsg = `Account migration failed: ${error}`;
    errors.push(errorMsg);
    console.error(errorMsg);
  }

  return { updated, errors };
}

async function migratePartnerTypes(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // 「顧客」→「得意先」の移行
    const customerPartners = await prisma.partner.findMany({
      where: { partnerType: "顧客" }
    });

    console.log(`Found ${customerPartners.length} partners with type "顧客"`);

    for (const partner of customerPartners) {
      try {
        await prisma.partner.update({
          where: { partnerCode: partner.partnerCode },
          data: { partnerType: PARTNER_TYPES.CUSTOMER } // "得意先"
        });
        updated++;
        console.log(`Updated partner ${partner.partnerCode} (${partner.partnerName}): 顧客 → 得意先`);
      } catch (error) {
        const errorMsg = `Failed to update partner ${partner.partnerCode}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // 「銀行」→「金融機関」の移行
    const bankPartners = await prisma.partner.findMany({
      where: { partnerType: "銀行" }
    });

    console.log(`Found ${bankPartners.length} partners with type "銀行"`);

    for (const partner of bankPartners) {
      try {
        await prisma.partner.update({
          where: { partnerCode: partner.partnerCode },
          data: { partnerType: PARTNER_TYPES.BANK } // "金融機関"
        });
        updated++;
        console.log(`Updated partner ${partner.partnerCode} (${partner.partnerName}): 銀行 → 金融機関`);
      } catch (error) {
        const errorMsg = `Failed to update partner ${partner.partnerCode}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // 他の型定義も確認
    const allPartners = await prisma.partner.findMany({
      select: { partnerCode: true, partnerName: true, partnerType: true }
    });

    const invalidPartners = allPartners.filter(partner => !isValidPartnerType(partner.partnerType));

    if (invalidPartners.length > 0) {
      console.warn("⚠️ Invalid partner types found:");
      invalidPartners.forEach(partner => {
        console.warn(`  ${partner.partnerCode} (${partner.partnerName}): "${partner.partnerType}"`);
        errors.push(`Invalid partner type: ${partner.partnerCode} has "${partner.partnerType}"`);
      });
    }

  } catch (error) {
    const errorMsg = `Partner migration failed: ${error}`;
    errors.push(errorMsg);
    console.error(errorMsg);
  }

  return { updated, errors };
}

async function checkCurrentData(): Promise<void> {
  console.log("📊 Current data summary:");
  
  try {
    // 勘定科目の種別分布
    const accountTypes = await prisma.account.groupBy({
      by: ['accountType'],
      _count: { accountType: true }
    });

    console.log("\n勘定科目種別分布:");
    accountTypes.forEach(type => {
      console.log(`  ${type.accountType}: ${type._count.accountType}件`);
    });

    // 取引先の種別分布
    const partnerTypes = await prisma.partner.groupBy({
      by: ['partnerType'],
      _count: { partnerType: true }
    });

    console.log("\n取引先種別分布:");
    partnerTypes.forEach(type => {
      console.log(`  ${type.partnerType}: ${type._count.partnerType}件`);
    });

  } catch (error) {
    console.error("Failed to check current data:", error);
  }
}

async function main(): Promise<void> {
  console.log("🚀 Starting master data type migration...");

  try {
    // 現在のデータ状況を確認
    await checkCurrentData();

    // 移行実行の確認
    console.log("\n❓ Proceed with migration? This will update existing data.");
    console.log("   Press Ctrl+C to cancel, or continue to proceed...");
    
    // 実際の移行処理
    console.log("\n🔄 Starting migrations...");
    
    const accountResult = await migrateAccountTypes();
    const partnerResult = await migratePartnerTypes();

    const result: MigrationResult = {
      accountsUpdated: accountResult.updated,
      partnersUpdated: partnerResult.updated,
      errors: [...accountResult.errors, ...partnerResult.errors]
    };

    console.log("\n✅ Migration completed!");
    console.log(`📈 Results:`);
    console.log(`  Accounts updated: ${result.accountsUpdated}`);
    console.log(`  Partners updated: ${result.partnersUpdated}`);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    // 移行後のデータ確認
    console.log("\n📊 Data after migration:");
    await checkCurrentData();

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // prisma.$disconnect() は不要（shared instanceのため）
  }
}

// スクリプト実行
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration script failed:", error);
      process.exit(1);
    });
}

export { main as runMigration };