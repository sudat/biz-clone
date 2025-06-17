import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateJournalNumber } from "../../lib/database/journal-number";

// faker.setLocale("ja"); // 新しいバージョンでは不要または異なる設定方法

const prisma = new PrismaClient();

export class TestDataHelper {
  /**
   * テスト用の勘定科目を作成
   */
  static async createTestAccount(
    data?: Partial<{
      accountCode: string;
      accountName: string;
      accountType: string;
      isActive: boolean;
    }>,
  ) {
    const accountData = {
      accountCode: data?.accountCode ||
        faker.number.int({ min: 1000, max: 9999 }).toString(),
      accountName: data?.accountName || faker.company.name(),
      accountType: data?.accountType || "asset",
      isActive: data?.isActive ?? true,
    };

    return await prisma.account.create({
      data: accountData,
    });
  }

  /**
   * テスト用の取引先を作成
   */
  static async createTestPartner(
    data?: Partial<{
      partnerCode: string;
      partnerName: string;
      partnerType: string;
      isActive: boolean;
    }>,
  ) {
    const partnerData = {
      partnerCode: data?.partnerCode ||
        faker.number.int({ min: 1000, max: 9999 }).toString(),
      partnerName: data?.partnerName || faker.company.name(),
      partnerType: data?.partnerType || "得意先",
      isActive: data?.isActive ?? true,
    };

    return await prisma.partner.create({
      data: partnerData,
    });
  }

  /**
   * テスト用の分析コードを作成
   */
  static async createTestAnalysisCode(
    data?: Partial<{
      analysisCode: string;
      analysisName: string;
      analysisType: string;
      isActive: boolean;
    }>,
  ) {
    const analysisData = {
      analysisCode: data?.analysisCode ||
        faker.number.int({ min: 100, max: 999 }).toString(),
      analysisName: data?.analysisName || faker.commerce.department(),
      analysisType: data?.analysisType || "cost_center",
      isActive: data?.isActive ?? true,
    };

    return await prisma.analysisCode.create({
      data: analysisData,
    });
  }

  /**
   * テスト用の仕訳を作成
   */
  static async createTestJournal(data?: {
    journalDate?: Date;
    description?: string;
    details?: Array<{
      accountCode: string;
      amount: number;
      side: "debit" | "credit";
      description?: string;
      partnerCode?: string;
      analysisCode?: string;
    }>;
  }) {
    const journalDate = data?.journalDate || new Date();
    const journalNumber = await generateJournalNumber(journalDate);
    const description = data?.description || faker.lorem.sentence();

    // 仕訳ヘッダーを作成
    const journal = await prisma.journalHeader.create({
      data: {
        journalNumber,
        journalDate,
        description,
      },
    });

    // 明細がある場合は作成
    if (data?.details && data.details.length > 0) {
      for (let i = 0; i < data.details.length; i++) {
        const detail = data.details[i];
        await prisma.journalDetail.create({
          data: {
            journalNumber,
            lineNumber: i + 1,
            accountCode: detail.accountCode,
            baseAmount: detail.amount || 0,
            taxAmount: 0,
            totalAmount: detail.amount || 0,
            debitCredit: detail.side || "D",
            lineDescription: detail.description || "",
            partnerCode: detail.partnerCode,
            analysisCode: detail.analysisCode,
          },
        });
      }
    }

    return journal;
  }

  /**
   * 複数のテスト用仕訳を作成
   */
  static async createMultipleTestJournals(count: number = 5) {
    const journals = [];

    for (let i = 0; i < count; i++) {
      const journal = await this.createTestJournal({
        journalDate: faker.date.recent({ days: 30 }),
        description: faker.lorem.sentence(),
        details: [
          {
            accountCode: "1000",
            amount: faker.number.int({ min: 1000, max: 100000 }),
            side: "debit" as const,
            description: faker.commerce.productDescription(),
          },
          {
            accountCode: "2000",
            amount: faker.number.int({ min: 1000, max: 100000 }),
            side: "credit" as const,
            description: faker.commerce.productDescription(),
          },
        ],
      });
      journals.push(journal);
    }

    return journals;
  }

  /**
   * テストデータをすべて削除
   */
  static async cleanupTestData() {
    // 外部キー制約の順序を考慮した削除順序
    await prisma.journalDetail.deleteMany({});
    await prisma.journalHeader.deleteMany({});
    await prisma.subAccount.deleteMany({});
    await prisma.analysisCode.deleteMany({});
    await prisma.partner.deleteMany({});
    await prisma.account.deleteMany({});
  }

  /**
   * 特定の仕訳番号の仕訳を削除
   */
  static async deleteJournal(journalNumber: string) {
    await prisma.journalDetail.deleteMany({
      where: { journalNumber },
    });
    await prisma.journalHeader.delete({
      where: { journalNumber },
    });
  }

  /**
   * 特定の勘定科目を削除
   */
  static async deleteAccount(accountCode: string) {
    await prisma.account.delete({
      where: { accountCode },
    });
  }

  /**
   * 特定の取引先を削除
   */
  static async deletePartner(partnerCode: string) {
    await prisma.partner.delete({
      where: { partnerCode },
    });
  }

  /**
   * 特定の分析コードを削除
   */
  static async deleteAnalysisCode(analysisCode: string) {
    await prisma.analysisCode.delete({
      where: { analysisCode },
    });
  }

  /**
   * データベース接続を閉じる
   */
  static async disconnect() {
    await prisma.$disconnect();
  }

  /**
   * 完全なテスト環境をセットアップ
   */
  static async setupTestEnvironment() {
    // 基本マスタデータを作成
    const accounts = await Promise.all([
      this.createTestAccount({
        accountCode: "1000",
        accountName: "現金",
        accountType: "asset",
      }),
      this.createTestAccount({
        accountCode: "2000",
        accountName: "買掛金",
        accountType: "liability",
      }),
      this.createTestAccount({
        accountCode: "3000",
        accountName: "売掛金",
        accountType: "asset",
      }),
      this.createTestAccount({
        accountCode: "4000",
        accountName: "売上高",
        accountType: "revenue",
      }),
      this.createTestAccount({
        accountCode: "5000",
        accountName: "仕入高",
        accountType: "expense",
      }),
    ]);

    const partners = await Promise.all([
      this.createTestPartner({
        partnerCode: "P001",
        partnerName: "テスト取引先A",
      }),
      this.createTestPartner({
        partnerCode: "P002",
        partnerName: "テスト取引先B",
      }),
    ]);

    const analysisCodes = await Promise.all([
      this.createTestAnalysisCode({
        analysisCode: "C001",
        analysisName: "営業部",
        analysisType: "cost_center",
      }),
      this.createTestAnalysisCode({
        analysisCode: "C002",
        analysisName: "管理部",
        analysisType: "cost_center",
      }),
    ]);

    return {
      accounts,
      partners,
      analysisCodes,
    };
  }

  /**
   * テスト用の完全な仕訳データを作成
   */
  static async createCompleteTestJournal() {
    const journal = await this.createTestJournal({
      journalDate: new Date("2024-01-15"),
      description: "テスト仕訳",
      details: [
        {
          accountCode: "1000",
          amount: 100000,
          side: "debit",
          description: "現金受取",
          partnerCode: "P001",
          analysisCode: "C001",
        },
        {
          accountCode: "4000",
          amount: 100000,
          side: "credit",
          description: "売上計上",
          partnerCode: "P001",
          analysisCode: "C001",
        },
      ],
    });

    return journal;
  }
}

/**
 * テスト用のユーティリティ関数
 */
export const testUtils = {
  /**
   * 金額を日本円フォーマットに変換
   */
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  },

  /**
   * 日付を日本語フォーマットに変換
   */
  formatDate: (date: Date): string => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  },

  /**
   * ランダムな仕訳番号を生成
   */
  generateRandomJournalNumber: (): string => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const random = faker.number.int({ min: 1000000, max: 9999999 });
    return `${dateStr}${random}`;
  },

  /**
   * テスト用の待機
   */
  wait: (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
