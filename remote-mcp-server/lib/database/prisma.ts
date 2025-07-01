import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Hyperdrive } from "@cloudflare/workers-types";

// グローバルPrismaクライアント管理
declare global {
  var __prisma: PrismaClient | undefined;
  var __hyperPrisma: Record<string, PrismaClient> | undefined;
  var __pgPools: Pool[] | undefined; // 接続プールのクリーンアップ用
}

/**
 * Cloudflare Workers用のPgPoolを作成
 * Supabase Pooler向けに最適化された設定
 */
function createOptimizedPool(connectionString: string) {
  const pool = new Pool({
    connectionString,
    // Cloudflare Workers環境での厳格な制限
    max: 1, // Worker インスタンスあたり最大1接続
    min: 0, // 最小接続数は0（必要時のみ接続）
    // タイムアウト設定
    connectionTimeoutMillis: 30000, // 30秒
    idleTimeoutMillis: 60000, // 60秒でアイドル接続を閉じる
  });

  // グローバル管理に追加（クリーンアップ用）
  if (!global.__pgPools) global.__pgPools = [];
  global.__pgPools.push(pool);

  return pool;
}

/**
 * HyperDriveを使用したPrismaクライアント初期化
 * Cloudflare WorkersでHyperDriveを通じてSupabaseにアクセスするためのクライアント
 */
function createPrismaClient(
  hyperdrive?: Hyperdrive,
  databaseUrl?: string,
): PrismaClient {
  if (hyperdrive) {
    // Cloudflare Workers環境（Hyperdrive使用）
    const adapter = new PrismaPg({
      connectionString: hyperdrive.connectionString,
      // Hyperdrive がプールを管理するため max を 1 に抑えて接続枯渇を防ぐ
      max: 1,
      // 接続タイムアウトを追加
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 60000,
    } as any);
    return new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
  } else {
    // Cloudflare Workers環境での直接接続
    // Cloudflare Workers環境ではenvオブジェクトから取得、それ以外ではprocess.envから取得
    let connectionString = databaseUrl || process.env.DATABASE_URL;

    // 型チェックとデバッグ情報
    console.log("🔍 Prisma connection debug:");
    console.log("databaseUrl provided:", !!databaseUrl);
    console.log("databaseUrl type:", typeof databaseUrl);
    console.log("connectionString type:", typeof connectionString);
    console.log(
      "connectionString constructor:",
      connectionString?.constructor?.name,
    );

    // 文字列として強制変換
    if (connectionString && typeof connectionString !== "string") {
      console.log("⚠️ Converting connectionString to string");
      connectionString = String(connectionString);
    }

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    if (typeof connectionString !== "string") {
      throw new Error(
        `DATABASE_URL must be a string, got ${typeof connectionString}`,
      );
    }

    console.log("🔍 Final connectionString check:");
    console.log("Length:", connectionString.length);
    console.log("Type:", typeof connectionString);
    console.log("Is string:", typeof connectionString === "string");

    // Cloudflare Workers環境ではPrismaPgアダプターを使用
    // poolオブジェクトではなく、接続設定オブジェクトを直接渡す
    const adapter = new PrismaPg({
      connectionString: connectionString,
      max: 1, // Workersでは1接続に制限
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 60000,
    });

    console.log("🔍 PrismaPg adapter created");

    return new PrismaClient({
      adapter,
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
export function getPrismaClient(
  hyperdrive?: Hyperdrive,
  databaseUrl?: string,
): PrismaClient {
  if (hyperdrive) {
    const key = hyperdrive.connectionString;
    if (!global.__hyperPrisma) global.__hyperPrisma = {};
    if (!global.__hyperPrisma[key]) {
      global.__hyperPrisma[key] = createPrismaClient(hyperdrive, databaseUrl);
    }
    return global.__hyperPrisma[key];
  }

  // 通常環境ではシングルトンパターンを使用
  if (!global.__prisma) {
    global.__prisma = createPrismaClient(undefined, databaseUrl);
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

/**
 * 全ての接続プールを安全にクリーンアップ
 * Worker終了時やエラー時に呼び出される
 */
export async function cleanupConnections() {
  try {
    // Prisma クライアントの切断
    if (global.__prisma) {
      await global.__prisma.$disconnect();
      global.__prisma = undefined;
    }

    // Hyperdrive Prisma クライアントの切断
    if (global.__hyperPrisma) {
      await Promise.all(
        Object.values(global.__hyperPrisma).map((client) =>
          client.$disconnect()
        ),
      );
      global.__hyperPrisma = undefined;
    }

    // Pg プールの切断
    if (global.__pgPools) {
      await Promise.all(
        global.__pgPools.map((pool) => pool.end()),
      );
      global.__pgPools = undefined;
    }
  } catch (error) {
    console.error("🔗 Connection cleanup error:", error);
  }
}
