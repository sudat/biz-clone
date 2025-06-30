import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Hyperdrive } from "@cloudflare/workers-types";

/**
 * HyperDriveを使用したPrismaクライアントファクトリ
 * Cloudflare WorkersでHyperDriveを通じてSupabaseにアクセスするためのクライアント
 */
export function createPrismaClient(hyperdrive: Hyperdrive): PrismaClient {
  // Override env vars
  (process as any).env.DATABASE_URL = hyperdrive.connectionString;
  const adapter = new PrismaPg({
    connectionString: hyperdrive.connectionString,
  });
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

// Prismaの型エクスポート（Appで使用するため）
export type {
  Account,
  AnalysisCode,
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
