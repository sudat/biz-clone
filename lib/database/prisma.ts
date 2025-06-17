import { PrismaClient } from "@prisma/client";

// Prismaクライアントのシングルトン実装
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["error", "warn"] // 開発時もqueryログを無効化
    : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
