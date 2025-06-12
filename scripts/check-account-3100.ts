/**
 * 勘定科目コード3100の存在確認スクリプト
 */

import { prisma } from "@/lib/database/prisma";

async function checkAccount3100(): Promise<void> {
  console.log("🔍 勘定科目コード 3100 の存在確認...");

  try {
    // 3100コードの存在確認
    const existingAccount = await prisma.account.findUnique({
      where: { accountCode: "3100" }
    });

    if (existingAccount) {
      console.log("✅ 勘定科目コード 3100 が見つかりました:");
      console.log({
        コード: existingAccount.accountCode,
        名称: existingAccount.accountName,
        種別: existingAccount.accountType,
        有効: existingAccount.isActive,
        作成日: existingAccount.createdAt,
        更新日: existingAccount.updatedAt
      });
    } else {
      console.log("❌ 勘定科目コード 3100 は存在しません");
    }

    // 3000番台の科目一覧も確認
    console.log("\n📋 3000番台の勘定科目一覧:");
    const accounts3000s = await prisma.account.findMany({
      where: {
        accountCode: {
          startsWith: "3"
        }
      },
      orderBy: { accountCode: "asc" }
    });

    if (accounts3000s.length > 0) {
      console.table(accounts3000s.map(acc => ({
        コード: acc.accountCode,
        名称: acc.accountName,
        種別: acc.accountType,
        有効: acc.isActive
      })));
    } else {
      console.log("3000番台の勘定科目は存在しません");
    }

  } catch (error) {
    console.error("❌ 確認中にエラーが発生しました:", error);
  }
}

async function main(): Promise<void> {
  try {
    await checkAccount3100();
  } catch (error) {
    console.error("💥 スクリプト実行エラー:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}