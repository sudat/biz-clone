/**
 * 取引先種別の英語データを日本語に修正
 * ============================================================================
 */

import { prisma } from "@/lib/database/prisma";
import { PARTNER_TYPES } from "@/types/master-types";

const ENGLISH_TO_JAPANESE_MAP = {
  "customer": PARTNER_TYPES.CUSTOMER,  // "得意先"
  "vendor": PARTNER_TYPES.SUPPLIER,    // "仕入先"
  "bank": PARTNER_TYPES.BANK,          // "金融機関"
  "other": PARTNER_TYPES.OTHER         // "その他"
} as const;

async function fixPartnerTypes(): Promise<void> {
  console.log("🔧 Fixing English partner types...");

  try {
    for (const [englishType, japaneseType] of Object.entries(ENGLISH_TO_JAPANESE_MAP)) {
      const partners = await prisma.partner.findMany({
        where: { partnerType: englishType }
      });

      console.log(`Found ${partners.length} partners with type "${englishType}"`);

      for (const partner of partners) {
        try {
          await prisma.partner.update({
            where: { partnerCode: partner.partnerCode },
            data: { partnerType: japaneseType }
          });
          console.log(`  ✅ Updated ${partner.partnerCode} (${partner.partnerName}): ${englishType} → ${japaneseType}`);
        } catch (error) {
          console.error(`  ❌ Failed to update ${partner.partnerCode}: ${error}`);
        }
      }
    }

    // 結果確認
    const partnerTypes = await prisma.partner.groupBy({
      by: ['partnerType'],
      _count: { partnerType: true }
    });

    console.log("\n📊 Updated partner type distribution:");
    partnerTypes.forEach(type => {
      console.log(`  ${type.partnerType}: ${type._count.partnerType}件`);
    });

  } catch (error) {
    console.error("❌ Fix failed:", error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    await fixPartnerTypes();
    console.log("\n🎉 Partner type fix completed successfully");
  } catch (error) {
    console.error("\n💥 Fix failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}