/**
 * テスト仕訳生成Server Actions
 * ============================================================================
 * 勘定照合マスタに基づく本支店仕訳ペアのテストデータ生成
 * ============================================================================
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import {
  generateJournalNumber,
  JournalNumberService,
} from "@/lib/database/journal-number";
import { convertToJapaneseDate } from "@/lib/utils/date-utils";
import { getCurrentUserIdFromCookie } from "@/lib/utils/auth-utils";

// テスト仕訳生成用のパラメータ型
export interface TestJournalGeneratorParams {
  fromDate: string; // 開始日（YYYY-MM-DD）
  toDate: string; // 終了日（YYYY-MM-DD）
  journalCount: number; // 作成件数
}

// テスト仕訳生成結果
export interface TestJournalGeneratorResult {
  success: boolean;
  createdJournals?: Array<{
    journalNumber: string;
    journalDate: string;
    description: string;
    totalAmount: number;
    pairJournalNumber?: string;
  }>;
  error?: string;
}

// 勘定照合マスタ情報
interface ReconciliationMappingInfo {
  mappingId: string;
  departmentCode: string;
  accountCode: string;
  counterDepartmentCode: string;
  counterAccountCode: string;
  description?: string | null;
}

// テスト用の取引パターン
const TEST_TRANSACTION_PATTERNS = [
  {
    description: "売上金の内部振替",
    baseAmount: 100000,
    variations: [0.8, 1.0, 1.2, 1.5, 2.0], // 金額のバリエーション
  },
  {
    description: "経費の部門間配賦",
    baseAmount: 50000,
    variations: [0.5, 0.8, 1.0, 1.3, 1.8],
  },
  {
    description: "資産の部門間移管",
    baseAmount: 200000,
    variations: [0.6, 1.0, 1.4, 2.0, 3.0],
  },
  {
    description: "費用の内部精算",
    baseAmount: 30000,
    variations: [0.7, 1.0, 1.2, 1.6, 2.2],
  },
  {
    description: "本支店間資金移動",
    baseAmount: 500000,
    variations: [0.4, 0.8, 1.0, 1.5, 2.5],
  },
];

/**
 * UUID形式の検証
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * テスト用ユニーク番号を生成
 * 形式: "TEST" + 8桁の数値
 */
function generateTestUniqueNumber(): string {
  const randomNumber = Math.floor(Math.random() * 100000000);
  return `TEST${randomNumber.toString().padStart(8, "0")}`;
}

/**
 * 指定期間内のランダムな日付を生成
 */
function getRandomDateInRange(fromDate: string, toDate: string): Date {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  return new Date(startDate.getTime() + randomTime);
}

/**
 * テスト金額を生成（税込み）
 */
function generateTestAmount(pattern: typeof TEST_TRANSACTION_PATTERNS[0]): {
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const variation =
    pattern.variations[Math.floor(Math.random() * pattern.variations.length)];
  const baseAmount = Math.floor(pattern.baseAmount * variation);
  const taxAmount = Math.floor(baseAmount * 0.1); // 10%税率
  const totalAmount = baseAmount + taxAmount;

  return { baseAmount, taxAmount, totalAmount };
}

/**
 * アクティブな勘定照合マスタを取得
 */
async function getActiveReconciliationMappings(): Promise<
  ReconciliationMappingInfo[]
> {
  const mappings = await prisma.reconciliationMapping.findMany({
    where: { isActive: true },
    select: {
      mappingId: true,
      departmentCode: true,
      accountCode: true,
      counterDepartmentCode: true,
      counterAccountCode: true,
      description: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return mappings;
}

/**
 * 勘定照合マスタに基づくテスト仕訳ペアを作成（事前生成番号使用）
 */
async function createJournalPair(
  mapping: ReconciliationMappingInfo,
  journalDate: Date,
  pattern: typeof TEST_TRANSACTION_PATTERNS[0],
  currentUserId: string | null,
  mainJournalNumber: string,
  counterJournalNumber: string,
  randomDebitAccount: string,
  randomCreditAccount: string,
  uniqueNumber: string,
  tx: Omit<
    typeof prisma,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
): Promise<{
  mainJournal: string;
  counterJournal: string;
  description: string;
  amount: number;
}> {
  // テスト金額の生成
  const { baseAmount, taxAmount, totalAmount } = generateTestAmount(pattern);

  // 仕訳日付を日本時間に変換
  const journalDateJST = convertToJapaneseDate(journalDate);

  // 仕訳説明の組み立て
  const description =
    `[${uniqueNumber}] ${pattern.description}（${mapping.departmentCode}→${mapping.counterDepartmentCode}）`;

  await tx.journalHeader.create({
    data: {
      journalNumber: mainJournalNumber,
      journalDate: journalDateJST,
      description: description,
      totalAmount: totalAmount,
      createdBy: currentUserId,
      approvalStatus: "pending",
    },
  });

  // 1つ目の仕訳明細（借方：ランダム科目、貸方：本支店科目）
  await tx.journalDetail.createMany({
    data: [
      {
        journalNumber: mainJournalNumber,
        lineNumber: 1,
        debitCredit: "D",
        accountCode: randomDebitAccount,
        departmentCode: mapping.departmentCode,
        baseAmount: baseAmount,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        lineDescription: `[${uniqueNumber}] ${pattern.description} 借方`,
      },
      {
        journalNumber: mainJournalNumber,
        lineNumber: 2,
        debitCredit: "C",
        accountCode: mapping.accountCode,
        departmentCode: mapping.departmentCode,
        baseAmount: baseAmount,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        lineDescription: `[${uniqueNumber}] ${pattern.description} 貸方`,
      },
    ],
  });

  await tx.journalHeader.create({
    data: {
      journalNumber: counterJournalNumber,
      journalDate: journalDateJST,
      description: description,
      totalAmount: totalAmount,
      createdBy: currentUserId,
      approvalStatus: "pending",
    },
  });

  // 2つ目の仕訳明細（借方・貸方が逆転、部門は相手部門）
  await tx.journalDetail.createMany({
    data: [
      {
        journalNumber: counterJournalNumber,
        lineNumber: 1,
        debitCredit: "D", // 元の貸方を借方に
        accountCode: mapping.counterAccountCode,
        departmentCode: mapping.counterDepartmentCode,
        baseAmount: baseAmount,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        lineDescription:
          `[${uniqueNumber}] ${pattern.description} 借方（相手部門）`,
      },
      {
        journalNumber: counterJournalNumber,
        lineNumber: 2,
        debitCredit: "C", // 元の借方を貸方に
        accountCode: randomCreditAccount,
        departmentCode: mapping.counterDepartmentCode,
        baseAmount: baseAmount,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        lineDescription:
          `[${uniqueNumber}] ${pattern.description} 貸方（相手部門）`,
      },
    ],
  });

  return {
    mainJournal: mainJournalNumber,
    counterJournal: counterJournalNumber,
    description: description,
    amount: totalAmount,
  };
}

/**
 * テスト仕訳生成のメイン処理
 */
export async function generateTestJournals(
  params: TestJournalGeneratorParams,
): Promise<TestJournalGeneratorResult> {
  try {
    // バリデーション
    if (!params.fromDate || !params.toDate) {
      return {
        success: false,
        error: "開始日と終了日は必須です",
      };
    }

    if (params.journalCount <= 0 || params.journalCount > 100) {
      return {
        success: false,
        error: "作成件数は1〜100件の範囲で指定してください",
      };
    }

    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);

    if (fromDate > toDate) {
      return {
        success: false,
        error: "開始日は終了日以前である必要があります",
      };
    }

    // 現在のユーザIDを取得
    const currentUserId = await getCurrentUserIdFromCookie();

    // UUIDのバリデーション
    if (currentUserId && !isValidUUID(currentUserId)) {
      console.error("無効なUUID形式:", currentUserId);
      return {
        success: false,
        error: "ユーザー認証に問題があります。再ログインしてください。",
      };
    }

    // アクティブな勘定照合マスタを取得
    const mappings = await getActiveReconciliationMappings();

    if (mappings.length === 0) {
      return {
        success: false,
        error:
          "アクティブな勘定照合マスタが見つかりません。勘定照合マスタを先に設定してください。",
      };
    }

    // 本支店科目コードのセットを作成（除外リスト）
    const branchAccountSet = new Set<string>();
    mappings.forEach((m) => {
      branchAccountSet.add(m.accountCode);
      branchAccountSet.add(m.counterAccountCode);
    });

    // 除外リストを除いた勘定科目を取得
    const candidateAccounts = await prisma.account.findMany({
      where: {
        isActive: true,
        isDetail: true,
        accountCode: { notIn: Array.from(branchAccountSet) },
      },
      select: { accountCode: true },
    });

    if (candidateAccounts.length === 0) {
      return {
        success: false,
        error: "本支店科目を除外した勘定科目が見つかりません。",
      };
    }

    // 仕訳ペア情報を事前に準備（既存の仕訳番号生成を使用、十分な待機時間でレースコンディション回避）
    const journalPairs: Array<{
      mapping: ReconciliationMappingInfo;
      journalDate: Date;
      pattern: typeof TEST_TRANSACTION_PATTERNS[0];
      mainJournalNumber: string;
      counterJournalNumber: string;
      randomDebitAccount: string;
      randomCreditAccount: string;
      uniqueNumber: string;
    }> = [];

    // 日付ごとのシーケンスキャッシュ
    const seqCache = new Map<string, number>();

    for (let i = 0; i < params.journalCount; i++) {
      // ランダムな日付を生成
      const journalDate = getRandomDateInRange(params.fromDate, params.toDate);

      // ランダムな勘定照合マスタを選択
      const mapping = mappings[Math.floor(Math.random() * mappings.length)];

      // ランダムな取引パターンを選択
      const pattern = TEST_TRANSACTION_PATTERNS[
        Math.floor(Math.random() * TEST_TRANSACTION_PATTERNS.length)
      ];

      // ランダムな勘定科目（本支店科目を除外）
      const randomCreditAccount =
        candidateAccounts[Math.floor(Math.random() * candidateAccounts.length)]
          .accountCode;
      const randomDebitAccount =
        candidateAccounts[Math.floor(Math.random() * candidateAccounts.length)]
          .accountCode;

      // 既存の仕訳番号生成（十分な待機時間で重複回避）
      const mainJournalNumber = await getNextJournalNumberLocal(
        journalDate,
        seqCache,
      );
      const counterJournalNumber = await getNextJournalNumberLocal(
        journalDate,
        seqCache,
      );

      // ペア共通のTEST番号を生成
      const uniqueNumber = generateTestUniqueNumber();

      journalPairs.push({
        mapping,
        journalDate,
        pattern,
        mainJournalNumber,
        counterJournalNumber,
        randomDebitAccount,
        randomCreditAccount,
        uniqueNumber,
      });
    }

    // トランザクション内でテスト仕訳を作成
    const result = await prisma.$transaction(async (tx) => {
      const createdJournals: Array<{
        journalNumber: string;
        journalDate: string;
        description: string;
        totalAmount: number;
        pairJournalNumber?: string;
      }> = [];

      for (let i = 0; i < journalPairs.length; i++) {
        const pairInfo = journalPairs[i];

        // 仕訳ペアの作成（番号は事前生成済み）
        const journalPair = await createJournalPair(
          pairInfo.mapping,
          pairInfo.journalDate,
          pairInfo.pattern,
          currentUserId,
          pairInfo.mainJournalNumber,
          pairInfo.counterJournalNumber,
          pairInfo.randomDebitAccount,
          pairInfo.randomCreditAccount,
          pairInfo.uniqueNumber,
          tx,
        );

        // 結果に追加
        createdJournals.push({
          journalNumber: journalPair.mainJournal,
          journalDate: pairInfo.journalDate.toISOString().split("T")[0],
          description: journalPair.description,
          totalAmount: journalPair.amount,
          pairJournalNumber: journalPair.counterJournal,
        });

        // ペア仕訳も結果に追加
        createdJournals.push({
          journalNumber: journalPair.counterJournal,
          journalDate: pairInfo.journalDate.toISOString().split("T")[0],
          description: journalPair.description,
          totalAmount: journalPair.amount,
          pairJournalNumber: journalPair.mainJournal,
        });
      }

      return createdJournals;
    });

    // キャッシュ更新
    revalidatePath("/siwake");

    return {
      success: true,
      createdJournals: result,
    };
  } catch (error) {
    console.error("テスト仕訳生成エラー:", error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "テスト仕訳の生成に失敗しました",
    };
  }
}

/**
 * テスト仕訳生成の実行可能性チェック
 */
export async function checkTestJournalGenerationAvailability(): Promise<{
  success: boolean;
  mappingCount?: number;
  availablePatterns?: number;
  error?: string;
}> {
  try {
    // アクティブな勘定照合マスタの数を確認
    const mappingCount = await prisma.reconciliationMapping.count({
      where: { isActive: true },
    });

    return {
      success: true,
      mappingCount,
      availablePatterns: TEST_TRANSACTION_PATTERNS.length,
    };
  } catch (error) {
    console.error("テスト仕訳生成可能性チェックエラー:", error);
    return {
      success: false,
      error: "チェックに失敗しました",
    };
  }
}

/**
 * 勘定照合マスタ一覧の取得（テスト仕訳生成用）
 */
export async function getReconciliationMappingsForTesting(): Promise<{
  success: boolean;
  data?: Array<{
    mappingId: string;
    departmentCode: string;
    departmentName?: string | undefined;
    accountCode: string;
    accountName?: string | undefined;
    counterDepartmentCode: string;
    counterDepartmentName?: string | undefined;
    counterAccountCode: string;
    counterAccountName?: string | undefined;
    description?: string | null | undefined;
  }>;
  error?: string;
}> {
  try {
    const mappings = await prisma.reconciliationMapping.findMany({
      where: { isActive: true },
      select: {
        mappingId: true,
        departmentCode: true,
        accountCode: true,
        counterDepartmentCode: true,
        counterAccountCode: true,
        description: true,
      },
      orderBy: [
        { departmentCode: "asc" },
        { accountCode: "asc" },
      ],
    });

    // 関連データを取得してマージ
    const mappingsWithNames = await Promise.all(
      mappings.map(async (mapping) => {
        const [department, account, counterDepartment, counterAccount] =
          await Promise.all([
            prisma.department.findUnique({
              where: { departmentCode: mapping.departmentCode },
              select: { departmentName: true },
            }),
            prisma.account.findUnique({
              where: { accountCode: mapping.accountCode },
              select: { accountName: true },
            }),
            prisma.department.findUnique({
              where: { departmentCode: mapping.counterDepartmentCode },
              select: { departmentName: true },
            }),
            prisma.account.findUnique({
              where: { accountCode: mapping.counterAccountCode },
              select: { accountName: true },
            }),
          ]);

        return {
          ...mapping,
          departmentName: department?.departmentName,
          accountName: account?.accountName,
          counterDepartmentName: counterDepartment?.departmentName,
          counterAccountName: counterAccount?.accountName,
        };
      }),
    );

    return { success: true, data: mappingsWithNames };
  } catch (error) {
    console.error("勘定照合マスタ取得エラー:", error);
    return { success: false, error: "勘定照合マスタの取得に失敗しました" };
  }
}

/**
 * 日付ごとにローカルで連番を管理しながら仕訳番号を生成するユーティリティ
 * 1. 最初の呼び出し時に DB からその日付の最新シーケンスを取得
 * 2. 以降はメモリ上で +1 しながら番号を生成
 */
async function getNextJournalNumberLocal(
  journalDate: Date,
  cache: Map<string, number>,
): Promise<string> {
  const datePrefix = `${journalDate.getFullYear()}${
    String(journalDate.getMonth() + 1).padStart(2, "0")
  }${String(journalDate.getDate()).padStart(2, "0")}`;

  let nextSeq = cache.get(datePrefix);

  // キャッシュに無ければ DB を見て初期値を取得
  if (nextSeq === undefined) {
    const result = await JournalNumberService.generateNextJournalNumber(
      `${journalDate.getFullYear()}-${
        String(journalDate.getMonth() + 1).padStart(2, "0")
      }-${String(journalDate.getDate()).padStart(2, "0")}`,
    );
    if (!result.success || !result.data) {
      throw new Error(result.error || "仕訳番号の初期取得に失敗しました");
    }
    // 取得した番号のシーケンス部分を数値化
    const seqStr = result.data.slice(-6);
    const seqNum = parseInt(seqStr, 10);
    cache.set(datePrefix, seqNum + 1); // 次に使う番号をキャッシュ
    return result.data;
  }

  // キャッシュにあればそれを使用
  const journalNumber = datePrefix + String(nextSeq).padStart(6, "0");
  cache.set(datePrefix, nextSeq + 1);
  return journalNumber;
}
