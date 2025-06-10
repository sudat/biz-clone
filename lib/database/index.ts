// Prismaクライアント
export { prisma } from "./prisma";

// 基本型定義 (統一されたPrisma型定義から)
export type {
  Account,
  Partner,
  AnalysisCode,
  JournalHeader,
  JournalDetail
} from "./prisma";

// Client Serviceラッパーは削除済み
// コンポーネントから直接Server Actionsを呼び出してください

// 仕訳番号サービス
export { JournalNumberService } from "./journal-number";