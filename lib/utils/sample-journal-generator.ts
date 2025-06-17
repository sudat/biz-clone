import { faker } from "@faker-js/faker";
import { prisma } from "@/lib/database/prisma";
import { Prisma } from "@prisma/client";

/**
 * 開発・デモ用途のダミー仕訳を大量生成するユーティリティ。
 *
 * - `count` で生成する仕訳ヘッダ件数を指定（1件につき借方・貸方の2行を作成）
 * - 既存のマスターデータ（勘定科目・税区分）を利用
 * - 本番コードから独立しているため import して呼び出すだけで利用可能
 */
export async function generateSampleJournals(count = 1000) {
  // 借方・貸方候補の勘定科目を取得
  const accounts = await prisma.account.findMany({
    where: { isActive: true, isDetail: true, isTaxAccount: false },
    select: {
      accountCode: true,
      accountType: true,
      defaultTaxCode: true,
    },
  });

  if (accounts.length < 2) {
    throw new Error(
      "勘定科目マスタに十分なデータがありません。先にマスタデータを投入してください。",
    );
  }

  const debitCandidates = accounts.filter((a) =>
    ["資産", "費用"].includes(a.accountType)
  );
  const creditCandidates = accounts.filter((a) =>
    ["負債", "収益"].includes(a.accountType)
  );

  if (debitCandidates.length === 0 || creditCandidates.length === 0) {
    throw new Error("借方／貸方の候補勘定科目が不足しています。");
  }

  // 乱数シード固定で再現性を持たせても良いが、ここでは都度ランダム
  console.time(`generateSampleJournals(${count})`);

  for (let i = 0; i < count; i++) {
    const baseAmount = faker.number.int({ min: 1000, max: 100000 });

    const debitAccount = faker.helpers.arrayElement(debitCandidates);
    const creditAccount = faker.helpers.arrayElement(creditCandidates);

    // 10%固定（本番ロジック簡素化）。税区分マスタがある場合はそちらを参照しても良い
    const taxRateDecimal = 0.1;
    const taxAmount = Math.round(baseAmount * taxRateDecimal);
    const totalAmount = baseAmount + taxAmount;

    // 連番形式: JVYYYYMMDDxxxx
    const journalDate = faker.date.between({
      from: new Date(`${new Date().getFullYear()}-01-01`),
      to: new Date(`${new Date().getFullYear()}-12-31`),
    });
    const journalNumber = `JV${
      journalDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")
    }${String(i + 1).padStart(4, "0")}`;

    // Prisma Decimal 型へ変換
    const baseDec = new Prisma.Decimal(baseAmount);
    const taxDec = new Prisma.Decimal(taxAmount);
    const totalDec = new Prisma.Decimal(totalAmount);

    await prisma.$transaction([
      prisma.journalHeader.create({
        data: {
          journalNumber,
          journalDate,
          description: faker.word.words({ count: { min: 2, max: 6 } }),
          totalAmount: totalDec,
        },
      }),
      prisma.journalDetail.createMany({
        data: [
          {
            journalNumber,
            lineNumber: 1,
            debitCredit: "D",
            accountCode: debitAccount.accountCode,
            baseAmount: baseDec,
            taxAmount: taxDec,
            totalAmount: totalDec,
            taxCode: debitAccount.defaultTaxCode ?? null,
          },
          {
            journalNumber,
            lineNumber: 2,
            debitCredit: "C",
            accountCode: creditAccount.accountCode,
            baseAmount: baseDec,
            taxAmount: taxDec,
            totalAmount: totalDec,
            taxCode: creditAccount.defaultTaxCode ?? null,
          },
        ],
      }),
    ]);
  }

  console.timeEnd(`generateSampleJournals(${count})`);
}
