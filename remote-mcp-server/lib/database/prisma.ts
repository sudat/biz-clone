import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Hyperdrive } from "@cloudflare/workers-types";

// グローバルPrismaクライアント管理
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * HyperDriveを使用したPrismaクライアント初期化
 * Cloudflare WorkersでHyperDriveを通じてSupabaseにアクセスするためのクライアント
 */
function createPrismaClient(hyperdrive?: Hyperdrive): PrismaClient {
  if (hyperdrive) {
    // Cloudflare Workers環境（Hyperdrive使用）
    const adapter = new PrismaPg({
      connectionString: hyperdrive.connectionString,
    });
    return new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
  } else {
    // 通常環境またはローカル開発環境
    return new PrismaClient({
      log: process.env.NODE_ENV === "development"
        ? ["error", "warn"] // 開発時もqueryログを無効化
        : ["error"],
    });
  }
}

/**
 * 統一されたPrismaクライアント取得
 * 環境に応じて適切なクライアントを返す
 */
export function getPrismaClient(hyperdrive?: Hyperdrive): PrismaClient {
  if (hyperdrive) {
    // Cloudflare Workers環境では毎回新しいクライアントを作成
    return createPrismaClient(hyperdrive);
  }

  // 通常環境ではシングルトンパターンを使用
  if (!global.__prisma) {
    global.__prisma = createPrismaClient();
  }
  return global.__prisma;
}

// デフォルトのPrismaクライアント（下位互換性のため）
// Edge Runtime環境では動的に初期化
export let prisma: any = null;

// Prismaの型エクスポート（Appで使用するため）
export type {
  Account,
  AnalysisCode,
  JournalAttachment,
  JournalDetail,
  JournalHeader,
  Partner,
  Prisma,
  Role,
  SubAccount,
  TaxRate,
  User,
  WorkflowOrganization,
  WorkflowOrganizationUser,
  WorkflowRoute,
  WorkflowRouteStep,
} from "@prisma/client";
