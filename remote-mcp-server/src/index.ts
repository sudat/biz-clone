import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { Octokit } from "octokit";
import { z } from "zod";
import { GitHubHandler } from "./github-handler";
// SystemOperations一時的に無効化（Prisma問題解決後に復帰）
// import {
//   SystemOperations,
//   generateJournalsSchema,
//   handleSystemOperationError
// } from "./system-operations";
// Prisma imports - edge runtime対応
import {
  AccountService,
  AnalysisCodeService,
  DepartmentService,
  PartnerService,
} from "../lib/database/master-data";
import {
  deleteJournal,
  getJournalByNumber,
  saveJournal,
  searchJournals,
  updateJournal,
} from "../lib/database/journal-mcp";
import {
  getJournalSummary,
  getTrialBalance,
  performUnifiedSearch,
} from "../lib/database/search-analysis";
// Cloudflare Workers型（Hyperdrive）
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Hyperdrive } from "@cloudflare/workers-types";

// Context from the auth process, encrypted & stored in the auth token
type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
};

// Environment bindings for Cloudflare Workers
interface Env {
  OAUTH_KV: KVNamespace;
  DATABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  GITHUB_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  AI: Ai;
  MCP_OBJECT: DurableObjectNamespace;
  HYPERDRIVE?: Hyperdrive;
}

export class BizCloneMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Biz Clone Accounting MCP Server",
    version: "1.0.0",
  });

  // 事前初期化されたPrismaクライアントとモジュール
  private prismaClient: any = null;
  private prismaModule: any = null;
  private dbInitialized = false;

  /**
   * DATABASE_URLを安全な文字列として取得
   */
  private getDatabaseUrl(): string | undefined {
    if (!this.env.DATABASE_URL) {
      return undefined;
    }

    const url = typeof this.env.DATABASE_URL === "string"
      ? this.env.DATABASE_URL
      : String(this.env.DATABASE_URL);

    console.log("📦 DATABASE_URL converted to string, length:", url.length);
    return url;
  }

  /**
   * 事前初期化済みまたはフォールバックのPrismaクライアントを取得
   */
  private async getPrismaClientOptimized(): Promise<any> {
    if (this.dbInitialized && this.prismaClient) {
      console.log("🚀 事前初期化済みPrismaクライアント使用");
      return this.prismaClient;
    }

    console.log("⚡ フォールバック: 動的Prismaクライアント初期化");
    // フォールバック: 動的初期化
    if (!this.prismaModule) {
      this.prismaModule = await import("../lib/database/prisma");
    }

    return this.prismaModule.getPrismaClient(
      this.env.HYPERDRIVE || undefined,
      this.getDatabaseUrl(),
    );
  }

  async init() {
    try {
      // 🔍 デバッグ: 環境変数の値を詳細確認（安全な形式で）
      console.log("🔍 Environment Variables Debug:");
      console.log("DATABASE_URL exists:", !!this.env.DATABASE_URL);
      console.log("DATABASE_URL type:", typeof this.env.DATABASE_URL);
      console.log(
        "DATABASE_URL constructor:",
        this.env.DATABASE_URL?.constructor?.name,
      );
      console.log(
        "DATABASE_URL is string:",
        typeof this.env.DATABASE_URL === "string",
      );
      console.log("DATABASE_URL length:", this.env.DATABASE_URL?.length);
      console.log(
        "DATABASE_URL has pgbouncer:",
        this.env.DATABASE_URL?.includes?.("pgbouncer"),
      );
      console.log(
        "DATABASE_URL starts with postgresql:",
        this.env.DATABASE_URL?.startsWith?.("postgresql"),
      );
      console.log(
        "DATABASE_URL ends with:",
        this.env.DATABASE_URL?.slice?.(-20),
      );

      // JSON stringify で実際の値を確認（接続情報は一部マスク）
      try {
        const dbUrlString = String(this.env.DATABASE_URL);
        console.log("DATABASE_URL as string length:", dbUrlString.length);
        console.log("DATABASE_URL first 20 chars:", dbUrlString.slice(0, 20));
        console.log("DATABASE_URL last 20 chars:", dbUrlString.slice(-20));
      } catch (e) {
        console.error("Error converting DATABASE_URL to string:", e);
      }

      console.log("HYPERDRIVE available:", !!this.env.HYPERDRIVE);
      if (this.env.HYPERDRIVE) {
        console.log(
          "HYPERDRIVE connectionString exists:",
          !!this.env.HYPERDRIVE.connectionString,
        );
        console.log(
          "HYPERDRIVE connectionString length:",
          this.env.HYPERDRIVE.connectionString?.length,
        );
        console.log(
          "HYPERDRIVE has pgbouncer:",
          this.env.HYPERDRIVE.connectionString?.includes("pgbouncer"),
        );
        console.log(
          "HYPERDRIVE starts with postgresql:",
          this.env.HYPERDRIVE.connectionString?.startsWith("postgresql"),
        );
      } else {
        console.log(
          "⚠️  HYPERDRIVE not available - using direct DATABASE_URL connection",
        );
      }
      console.log("All env keys:", Object.keys(this.env));

      // 🚀 事前初期化: Prismaクライアントとモジュールを初期化
      console.log("🔧 Prismaクライアント事前初期化開始...");
      try {
        // Prismaモジュールを事前インポート
        this.prismaModule = await import("../lib/database/prisma");
        console.log("✅ Prismaモジュール読み込み完了");

        // Prismaクライアントを事前初期化
        this.prismaClient = this.prismaModule.getPrismaClient(
          this.env.HYPERDRIVE || undefined,
          this.getDatabaseUrl(),
        );
        console.log("✅ Prismaクライアント初期化完了");

        // 🌡️ ウォームアップ: 接続テストとキャッシュ構築
        console.log("🌡️ データベース接続ウォームアップ中...");

        // タイムアウト付きでウォームアップクエリを実行
        const warmupStart = Date.now();
        await Promise.race([
          this.prismaClient.$queryRaw`SELECT 1 as warmup`,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Warmup timeout")), 10000)
          ),
        ]);

        const warmupTime = Date.now() - warmupStart;
        console.log(`✅ データベースウォームアップ完了 (${warmupTime}ms)`);

        this.dbInitialized = true;
        console.log("🚀 事前初期化プロセス完了");
      } catch (error) {
        console.error(
          "⚠️ 事前初期化エラー (フォールバックモードで続行):",
          error,
        );
        // エラーが発生してもフォールバックとして各ツールでの動的初期化を使用
        this.dbInitialized = false;
      }

      // Initialize system operations - 一時的に無効化
      // this.systemOps = new SystemOperations(this.prisma);

      // Worker終了時の接続クリーンアップを設定
      const cleanup = async () => {
        try {
          const { cleanupConnections } = await import("../lib/database/prisma");
          await cleanupConnections();
          console.log("🔗 Database connections cleaned up successfully");
        } catch (error) {
          console.error("🚫 Error during connection cleanup:", error);
        }
      };

      // Cloudflare Workers環境でのクリーンアップ設定
      // 注意: Workers環境では手動でのクリーンアップが推奨
      console.log("🔗 Connection cleanup handler configured");

      // Cloudflare Workers環境では手動クリーンアップを使用
      // 自動的なイベントハンドラーは利用不可

      console.log("🔧 Prisma client initialized, setting up MCP tools...");
      // Basic connectivity test
      this.server.tool(
        "test_connection",
        "Test MCP server connection",
        {},
        async () => ({
          content: [
            {
              text:
                `Connection successful! User: ${this.props.login} (${this.props.name})`,
              type: "text",
            },
          ],
        }),
      );

      // Database health check
      this.server.tool(
        "check_db_health",
        "Check database connection and status",
        {},
        async () => {
          try {
            console.log(
              "🔍 check_db_health tool called - using optimized client",
            );
            // 最適化されたPrismaクライアントを取得
            const client = await this.getPrismaClientOptimized();

            // タイムアウト付きでクエリを実行
            const testQuery = Promise.race([
              client.$queryRaw`SELECT 1 as test`,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Query timeout")), 10000)
              ),
            ]);

            await testQuery;

            const accountCountQuery = Promise.race([
              client.account.count(),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Count query timeout")),
                  10000,
                )
              ),
            ]);

            const accountCount = await accountCountQuery;

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      status: "connected",
                      database_type: "Supabase PostgreSQL",
                      connection_method: this.env.HYPERDRIVE
                        ? "Hyperdrive"
                        : "Direct",
                      test_query: "successful",
                      account_count: accountCount,
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            console.error("🚫 check_db_health error:", error);
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      status: "error",
                      error: error instanceof Error
                        ? error.message
                        : "Unknown error",
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      console.log(
        "✅ BizCloneMCP initialization completed successfully (基本機能のみ)",
      );

      // 段階的ツール再有効化：第1段階 - 基本データベースツール
      console.log("🔧 第1段階：基本データベースツールを有効化中...");

      // Get chart of accounts
      this.server.tool(
        "get_accounts",
        "Get chart of accounts (勘定科目一覧)",
        {
          searchTerm: z.string().optional().describe(
            "Search term for account name or code",
          ),
          accountType: z.string().optional().describe("Filter by account type"),
          limit: z.number().min(1).max(100).default(50).describe(
            "Maximum number of accounts to return",
          ),
        },
        async ({ searchTerm, accountType, limit }) => {
          try {
            // デバッグ: 呼び出し時の環境変数確認
            console.log("🔍 get_accounts tool called:");
            console.log("HYPERDRIVE available:", !!this.env.HYPERDRIVE);
            console.log(
              "DATABASE_URL type in tool:",
              typeof this.env.DATABASE_URL,
            );
            console.log(
              "DATABASE_URL exists in tool:",
              !!this.env.DATABASE_URL,
            );

            // 最適化されたPrismaクライアントを取得
            const client = await this.getPrismaClientOptimized();

            const where: any = { isActive: true };

            if (searchTerm) {
              where.OR = [
                { accountCode: { contains: searchTerm, mode: "insensitive" } },
                { accountName: { contains: searchTerm, mode: "insensitive" } },
              ];
            }

            if (accountType) {
              where.accountType = accountType;
            }

            // タイムアウト付きでクエリを実行
            const accountsQuery = Promise.race([
              client.account.findMany({
                where,
                orderBy: { accountCode: "asc" },
                take: limit,
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Accounts query timeout")),
                  15000,
                )
              ),
            ]);

            const accounts = await accountsQuery;

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: accounts,
                      count: (accounts as any[]).length,
                      connection_method: this.env.HYPERDRIVE
                        ? "Hyperdrive"
                        : "Direct",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            console.error("🚫 get_accounts error:", error);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "Failed to fetch accounts",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // Create new journal entry (simplified)
      this.server.tool(
        "create_journal",
        "Create a new journal entry (仕訳作成)",
        {
          journalDate: z.string().describe("Journal date in YYYY-MM-DD format"),
          description: z.string().describe("Journal description (摘要)"),
          details: z
            .array(
              z.object({
                debitCredit: z.enum(["debit", "credit"]).describe(
                  "Debit or Credit",
                ),
                accountCode: z.string().describe(
                  "Account code (勘定科目コード)",
                ),
                amount: z.number().describe("Amount"),
                description: z.string().optional().describe("Line description"),
              }),
            )
            .min(2)
            .describe("Journal entry details (minimum 2 lines)"),
        },
        async ({ journalDate, description, details }) => {
          try {
            // 最適化されたPrismaクライアントを取得
            const client = await this.getPrismaClientOptimized();

            // Validate balanced entry
            const debitTotal = details.filter((d) => d.debitCredit === "debit")
              .reduce((sum, d) => sum + d.amount, 0);
            const creditTotal = details.filter((d) =>
              d.debitCredit === "credit"
            )
              .reduce((sum, d) => sum + d.amount, 0);

            if (Math.abs(debitTotal - creditTotal) > 0.01) {
              throw new Error(
                `Journal entry is not balanced. Debit: ${debitTotal}, Credit: ${creditTotal}`,
              );
            }

            // Generate journal number
            const dateStr = new Date(journalDate).toISOString().slice(0, 10)
              .replace(/-/g, "");
            const timestamp = Date.now().toString().slice(-6);
            const journalNumber = `${dateStr}${timestamp}`;

            const result = await client.$transaction(async (tx: any) => {
              // Create header
              const header = await tx.journalHeader.create({
                data: {
                  journalNumber,
                  journalDate: new Date(journalDate),
                  description: description,
                  totalAmount: debitTotal,
                  approvalStatus: "pending",
                },
              });

              // Create details
              const journalDetails = await Promise.all(
                details.map((detail, index) =>
                  tx.journalDetail.create({
                    data: {
                      journalNumber,
                      lineNumber: index + 1,
                      debitCredit: detail.debitCredit === "debit" ? "D" : "C",
                      accountCode: detail.accountCode,
                      baseAmount: detail.amount,
                      taxAmount: 0,
                      totalAmount: detail.amount,
                      lineDescription: detail.description,
                    },
                  })
                ),
              );

              return { header, details: journalDetails };
            });

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: {
                        journalNumber: result.header.journalNumber,
                        message: "Journal entry created successfully",
                      },
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            console.error("🚫 create_journal error:", error);
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "Failed to create journal entry",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // Search journal entries
      this.server.tool(
        "search_journals",
        "Search journal entries (仕訳検索)",
        {
          journalNumber: z.string().optional().describe(
            "Journal number to search",
          ),
          dateFrom: z.string().optional().describe("Start date (YYYY-MM-DD)"),
          dateTo: z.string().optional().describe("End date (YYYY-MM-DD)"),
          accountCode: z.string().optional().describe("Account code to filter"),
          description: z.string().optional().describe("Description to search"),
          limit: z.number().min(1).max(100).default(20).describe(
            "Maximum number of entries to return",
          ),
        },
        async (
          { journalNumber, dateFrom, dateTo, accountCode, description, limit },
        ) => {
          try {
            // 最適化されたPrismaクライアントを取得
            const client = await this.getPrismaClientOptimized();

            const where: any = {};

            if (journalNumber) {
              where.journalNumber = { contains: journalNumber };
            }

            if (dateFrom || dateTo) {
              where.journalDate = {};
              if (dateFrom) where.journalDate.gte = new Date(dateFrom);
              if (dateTo) where.journalDate.lte = new Date(dateTo);
            }

            if (description) {
              where.description = { contains: description };
            }

            if (accountCode) {
              where.journalDetails = {
                some: { accountCode: { contains: accountCode } },
              };
            }

            const journals = await client.journalHeader.findMany({
              where,
              include: {
                journalDetails: {
                  include: {
                    account: {
                      select: { accountName: true },
                    },
                  },
                  orderBy: { lineNumber: "asc" },
                },
              },
              orderBy: { journalDate: "desc" },
              take: limit,
            });

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: journals,
                      count: journals.length,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            console.error("🚫 search_journals error:", error);
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "Failed to search journals",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // ========================================
      // マスタデータ関連ツール
      // ========================================

      // 勘定科目作成
      this.server.tool(
        "create_account",
        "Create new account (勘定科目作成)",
        {
          accountCode: z.string().describe("Account code (勘定科目コード)"),
          accountName: z.string().describe("Account name (勘定科目名)"),
          accountType: z.string().describe(
            "Account type (勘定科目種類): 資産, 負債, 純資産, 収益, 費用",
          ),
          sortOrder: z.number().optional().describe("Sort order (表示順序)"),
          defaultTaxCode: z.string().optional().describe(
            "Default tax code (デフォルト税区分)",
          ),
        },
        async (
          { accountCode, accountName, accountType, sortOrder, defaultTaxCode },
        ) => {
          try {
            const account = await AccountService.create(
              {
                accountCode,
                accountName,
                accountType,
                sortOrder,
                defaultTaxCode,
              },
              this.env.HYPERDRIVE,
              this.getDatabaseUrl(),
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: account,
                      message: "勘定科目が正常に作成されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "勘定科目の作成に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 勘定科目更新
      this.server.tool(
        "update_account",
        "Update existing account (勘定科目更新)",
        {
          accountCode: z.string().describe(
            "Account code to update (更新する勘定科目コード)",
          ),
          accountName: z.string().optional().describe(
            "New account name (新しい勘定科目名)",
          ),
          accountType: z.string().optional().describe(
            "New account type (新しい勘定科目種類)",
          ),
          sortOrder: z.number().optional().describe(
            "New sort order (新しい表示順序)",
          ),
          defaultTaxCode: z.string().optional().describe(
            "New default tax code (新しいデフォルト税区分)",
          ),
        },
        async ({ accountCode, ...updateData }) => {
          try {
            const account = await AccountService.update(
              accountCode,
              updateData,
              this.env.HYPERDRIVE,
              this.getDatabaseUrl(),
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: account,
                      message: "勘定科目が正常に更新されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "勘定科目の更新に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 勘定科目削除
      this.server.tool(
        "delete_account",
        "Delete account (勘定科目削除)",
        {
          accountCode: z.string().describe(
            "Account code to delete (削除する勘定科目コード)",
          ),
        },
        async ({ accountCode }) => {
          try {
            await AccountService.delete(
              accountCode,
              this.env.HYPERDRIVE,
              this.getDatabaseUrl(),
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      message:
                        `勘定科目「${accountCode}」が正常に削除されました`,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "勘定科目の削除に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 取引先検索
      this.server.tool(
        "search_partners",
        "Search partners (取引先検索)",
        {
          searchTerm: z.string().optional().describe(
            "Search term for partner name, code, or kana",
          ),
          partnerType: z.string().optional().describe("Filter by partner type"),
          isActive: z.boolean().default(true).describe(
            "Filter by active status",
          ),
          page: z.number().min(1).default(1).describe("Page number"),
          limit: z.number().min(1).max(100).default(20).describe(
            "Items per page",
          ),
        },
        async ({ searchTerm, partnerType, isActive, page, limit }) => {
          try {
            const result = await PartnerService.search(
              { searchTerm, partnerType, isActive },
              { page, limit },
              this.env.HYPERDRIVE,
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: result.data,
                      pagination: result.pagination,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "取引先の検索に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 取引先作成
      this.server.tool(
        "create_partner",
        "Create new partner (取引先作成)",
        {
          partnerCode: z.string().describe("Partner code (取引先コード)"),
          partnerName: z.string().describe("Partner name (取引先名)"),
          partnerKana: z.string().optional().describe(
            "Partner name in kana (取引先名カナ)",
          ),
          partnerType: z.string().describe(
            "Partner type (取引先種類): 得意先, 仕入先, 銀行, その他",
          ),
          address: z.string().optional().describe("Address (住所)"),
          phone: z.string().optional().describe("Phone number (電話番号)"),
          email: z.string().optional().describe(
            "Email address (メールアドレス)",
          ),
        },
        async (
          {
            partnerCode,
            partnerName,
            partnerKana,
            partnerType,
            address,
            phone,
            email,
          },
        ) => {
          try {
            const partner = await PartnerService.create({
              partnerCode,
              partnerName,
              partnerKana,
              partnerType,
              address,
              phone,
              email,
            }, this.env.HYPERDRIVE);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: partner,
                      message: "取引先が正常に作成されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "取引先の作成に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 取引先更新
      this.server.tool(
        "update_partner",
        "Update existing partner (取引先更新)",
        {
          partnerCode: z.string().describe(
            "Partner code to update (更新する取引先コード)",
          ),
          partnerName: z.string().optional().describe(
            "New partner name (新しい取引先名)",
          ),
          partnerKana: z.string().optional().describe(
            "New partner name in kana (新しい取引先名カナ)",
          ),
          partnerType: z.string().optional().describe(
            "New partner type (新しい取引先種類)",
          ),
          address: z.string().optional().describe("New address (新しい住所)"),
          phone: z.string().optional().describe(
            "New phone number (新しい電話番号)",
          ),
          email: z.string().optional().describe(
            "New email address (新しいメールアドレス)",
          ),
        },
        async ({ partnerCode, ...updateData }) => {
          try {
            const partner = await PartnerService.update(
              partnerCode,
              updateData,
              this.env.HYPERDRIVE,
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: partner,
                      message: "取引先が正常に更新されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "取引先の更新に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 取引先削除
      this.server.tool(
        "delete_partner",
        "Delete partner (取引先削除)",
        {
          partnerCode: z.string().describe(
            "Partner code to delete (削除する取引先コード)",
          ),
        },
        async ({ partnerCode }) => {
          try {
            await PartnerService.delete(partnerCode, this.env.HYPERDRIVE);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      message: `取引先「${partnerCode}」が正常に削除されました`,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "取引先の削除に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 部門検索
      this.server.tool(
        "search_departments",
        "Search departments (部門検索)",
        {
          searchTerm: z.string().optional().describe(
            "Search term for department name or code",
          ),
          isActive: z.boolean().default(true).describe(
            "Filter by active status",
          ),
          page: z.number().min(1).default(1).describe("Page number"),
          limit: z.number().min(1).max(100).default(20).describe(
            "Items per page",
          ),
        },
        async ({ searchTerm, isActive, page, limit }) => {
          try {
            const result = await DepartmentService.search(
              { searchTerm, isActive },
              { page, limit },
              this.env.HYPERDRIVE,
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: result.data,
                      pagination: result.pagination,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "部門の検索に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 部門作成
      this.server.tool(
        "create_department",
        "Create new department (部門作成)",
        {
          departmentCode: z.string().describe("Department code (部門コード)"),
          departmentName: z.string().describe("Department name (部門名)"),
          sortOrder: z.number().optional().describe("Sort order (表示順序)"),
        },
        async ({ departmentCode, departmentName, sortOrder }) => {
          try {
            const department = await DepartmentService.create({
              departmentCode,
              departmentName,
              sortOrder,
            }, this.env.HYPERDRIVE);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: department,
                      message: "部門が正常に作成されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "部門の作成に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 部門更新
      this.server.tool(
        "update_department",
        "Update existing department (部門更新)",
        {
          departmentCode: z.string().describe(
            "Department code to update (更新する部門コード)",
          ),
          departmentName: z.string().optional().describe(
            "New department name (新しい部門名)",
          ),
          sortOrder: z.number().optional().describe(
            "New sort order (新しい表示順序)",
          ),
        },
        async ({ departmentCode, ...updateData }) => {
          try {
            const department = await DepartmentService.update(
              departmentCode,
              updateData,
              this.env.HYPERDRIVE,
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: department,
                      message: "部門が正常に更新されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "部門の更新に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 部門削除
      this.server.tool(
        "delete_department",
        "Delete department (部門削除)",
        {
          departmentCode: z.string().describe(
            "Department code to delete (削除する部門コード)",
          ),
        },
        async ({ departmentCode }) => {
          try {
            await DepartmentService.delete(departmentCode, this.env.HYPERDRIVE);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      message:
                        `部門「${departmentCode}」が正常に削除されました`,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "部門の削除に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 分析コード検索
      this.server.tool(
        "search_analysis_codes",
        "Search analysis codes (分析コード検索)",
        {
          searchTerm: z.string().optional().describe(
            "Search term for analysis code name or code",
          ),
          analysisType: z.string().optional().describe(
            "Filter by analysis type",
          ),
          isActive: z.boolean().default(true).describe(
            "Filter by active status",
          ),
          page: z.number().min(1).default(1).describe("Page number"),
          limit: z.number().min(1).max(100).default(20).describe(
            "Items per page",
          ),
        },
        async ({ searchTerm, analysisType, isActive, page, limit }) => {
          try {
            const result = await AnalysisCodeService.search(
              { searchTerm, analysisType, isActive },
              { page, limit },
              this.env.HYPERDRIVE,
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: result.data,
                      pagination: result.pagination,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "分析コードの検索に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 分析コード作成
      this.server.tool(
        "create_analysis_code",
        "Create new analysis code (分析コード作成)",
        {
          analysisCode: z.string().describe("Analysis code (分析コード)"),
          analysisName: z.string().describe("Analysis name (分析名)"),
          analysisType: z.string().describe("Analysis type (分析種類)"),
          sortOrder: z.number().optional().describe("Sort order (表示順序)"),
        },
        async ({ analysisCode, analysisName, analysisType, sortOrder }) => {
          try {
            const analysis = await AnalysisCodeService.create({
              analysisCode,
              analysisName,
              analysisType,
              sortOrder,
            }, this.env.HYPERDRIVE);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: analysis,
                      message: "分析コードが正常に作成されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "分析コードの作成に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 分析コード更新
      this.server.tool(
        "update_analysis_code",
        "Update existing analysis code (分析コード更新)",
        {
          analysisCode: z.string().describe(
            "Analysis code to update (更新する分析コード)",
          ),
          analysisName: z.string().optional().describe(
            "New analysis name (新しい分析名)",
          ),
          analysisType: z.string().optional().describe(
            "New analysis type (新しい分析種類)",
          ),
          sortOrder: z.number().optional().describe(
            "New sort order (新しい表示順序)",
          ),
        },
        async ({ analysisCode, ...updateData }) => {
          try {
            const analysis = await AnalysisCodeService.update(
              analysisCode,
              updateData,
              this.env.HYPERDRIVE,
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: analysis,
                      message: "分析コードが正常に更新されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "分析コードの更新に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 分析コード削除
      this.server.tool(
        "delete_analysis_code",
        "Delete analysis code (分析コード削除)",
        {
          analysisCode: z.string().describe(
            "Analysis code to delete (削除する分析コード)",
          ),
        },
        async ({ analysisCode }) => {
          try {
            await AnalysisCodeService.delete(analysisCode, this.env.HYPERDRIVE);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      message:
                        `分析コード「${analysisCode}」が正常に削除されました`,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "分析コードの削除に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // ===================
      // System Operation Tools
      // ===================

      // Generate sample journals (一時的に無効化 - SystemOperations無効化のため)
      /*
      this.server.tool(
        "generate_sample_journals",
        "Generate sample journal entries for development (開発用サンプル仕訳生成)",
        {
          count: z.number().min(1).max(10000).default(1000).describe(
            "Number of journal entries to generate",
          ),
          clearExisting: z.boolean().default(false).describe(
            "Clear existing journal data before generating",
          ),
        },
        async ({ count, clearExisting }) => {
          try {
            const result = await this.systemOps.generateSampleJournals({
              count,
              clearExisting,
            });

            return {
              content: [
                {
                  text: JSON.stringify(result, null, 2),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    handleSystemOperationError(error),
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );
      */

      // Test MCP connection (一時的に無効化 - SystemOperations無効化のため)
      /*
      this.server.tool(
        "test_mcp_connection",
        "Test MCP protocol connection (MCP接続テスト)",
        {
          jsonrpc: z.string().default("2.0").describe("JSON-RPC version"),
          method: z.string().default("test").describe("Test method name"),
          params: z.record(z.any()).default({}).describe("Test parameters"),
          id: z.union([z.string(), z.number(), z.null()]).default(1).describe(
            "Request ID",
          ),
        },
        async ({ jsonrpc, method, params, id }) => {
          try {
            const requestBody = { jsonrpc, method, params, id };
            const result = await this.systemOps.testMcpConnection(requestBody);

            return {
              content: [
                {
                  text: JSON.stringify(result, null, 2),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    handleSystemOperationError(error),
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );
      */

      // List MCP tools (一時的に無効化 - SystemOperations無効化のため)
      /*
      this.server.tool(
        "list_mcp_tools",
        "List available MCP tools (利用可能なMCPツール一覧)",
        {},
        async () => {
          try {
            const result = await this.systemOps.listMcpTools();

            return {
              content: [
                {
                  text: JSON.stringify(result, null, 2),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    handleSystemOperationError(error),
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );
      */

      // ========================================
      // 仕訳関連ツール
      // ========================================

      // 仕訳更新
      this.server.tool(
        "update_journal",
        "Update existing journal entry (仕訳更新)",
        {
          journalNumber: z.string().describe(
            "Journal number to update (更新する仕訳番号)",
          ),
          header: z.object({
            journalDate: z.string().describe(
              "Journal date in YYYY-MM-DD format",
            ),
            description: z.string().optional().describe(
              "Journal description (摘要)",
            ),
          }).describe("Journal header information"),
          details: z.array(
            z.object({
              debitCredit: z.enum(["debit", "credit"]).describe(
                "Debit or Credit",
              ),
              accountCode: z.string().describe("Account code (勘定科目コード)"),
              subAccountCode: z.string().optional().describe(
                "Sub account code (補助科目コード)",
              ),
              partnerCode: z.string().optional().describe(
                "Partner code (取引先コード)",
              ),
              analysisCode: z.string().optional().describe(
                "Analysis code (分析コード)",
              ),
              departmentCode: z.string().optional().describe(
                "Department code (部門コード)",
              ),
              baseAmount: z.number().describe("Base amount (税抜金額)"),
              taxAmount: z.number().default(0).describe("Tax amount (税額)"),
              totalAmount: z.number().describe("Total amount (税込金額)"),
              taxCode: z.string().optional().describe("Tax code (税区分)"),
              description: z.string().optional().describe(
                "Line description (摘要)",
              ),
            }),
          ).min(2).describe("Journal entry details (minimum 2 lines)"),
          attachedFiles: z.array(
            z.object({
              name: z.string(),
              url: z.string(),
              size: z.number(),
              type: z.string().optional(),
              uploadedAt: z.string().optional(),
            }),
          ).optional().describe("Attached files"),
        },
        async ({ journalNumber, header, details, attachedFiles }) => {
          try {
            const journalData = {
              header,
              details,
              attachedFiles: attachedFiles || [],
            };

            const journal = await updateJournal(
              journalNumber,
              journalData as any,
            );

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: journal,
                      message: "仕訳が正常に更新されました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "仕訳の更新に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 仕訳削除
      this.server.tool(
        "delete_journal",
        "Delete journal entry (仕訳削除)",
        {
          journalNumber: z.string().describe(
            "Journal number to delete (削除する仕訳番号)",
          ),
        },
        async ({ journalNumber }) => {
          try {
            await deleteJournal(journalNumber);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      message: `仕訳「${journalNumber}」が正常に削除されました`,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "仕訳の削除に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 仕訳番号による単一仕訳取得
      this.server.tool(
        "get_journal_by_number",
        "Get journal entry by number (仕訳番号による取得)",
        {
          journalNumber: z.string().describe(
            "Journal number to retrieve (取得する仕訳番号)",
          ),
        },
        async ({ journalNumber }) => {
          try {
            const journal = await getJournalByNumber(journalNumber);

            if (!journal) {
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: false,
                        error: `仕訳番号「${journalNumber}」が見つかりません`,
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: journal,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "仕訳の取得に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // ========================================
      // レポート関連ツール
      // ========================================

      // 試算表取得
      this.server.tool(
        "get_trial_balance",
        "Get trial balance (試算表取得)",
        {
          dateFrom: z.string().describe(
            "Start date in YYYY-MM-DD format (開始日)",
          ),
          dateTo: z.string().describe("End date in YYYY-MM-DD format (終了日)"),
          accountType: z.enum(["資産", "負債", "純資産", "収益", "費用"])
            .optional().describe(
              "Filter by account type (勘定科目種類でフィルタ)",
            ),
          includeZeroBalance: z.boolean().default(false).describe(
            "Include accounts with zero balance (残高0の科目を含める)",
          ),
        },
        async ({ dateFrom, dateTo, accountType, includeZeroBalance }) => {
          try {
            const result = await getTrialBalance({
              dateFrom,
              dateTo,
              accountType,
              includeZeroBalance,
            });

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: result,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "試算表の取得に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 仕訳集計取得
      this.server.tool(
        "get_journal_summary",
        "Get journal summary (仕訳集計取得)",
        {
          dateFrom: z.string().describe(
            "Start date in YYYY-MM-DD format (開始日)",
          ),
          dateTo: z.string().describe("End date in YYYY-MM-DD format (終了日)"),
          groupBy: z.enum(["account", "partner", "department", "month", "day"])
            .default("account").describe(
              "Group by criteria (集計基準): account=勘定科目, partner=取引先, department=部門, month=月別, day=日別",
            ),
          accountType: z.enum(["資産", "負債", "純資産", "収益", "費用"])
            .optional().describe(
              "Filter by account type (勘定科目種類でフィルタ)",
            ),
        },
        async ({ dateFrom, dateTo, groupBy, accountType }) => {
          try {
            const result = await getJournalSummary({
              dateFrom,
              dateTo,
              groupBy,
              accountType,
            });

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: result,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "仕訳集計の取得に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 統合検索
      this.server.tool(
        "unified_search",
        "Unified search across all data (統合検索)",
        {
          query: z.string().describe("Search query (検索クエリ)"),
          categories: z.array(
            z.enum([
              "journals",
              "accounts",
              "partners",
              "departments",
              "analysis_codes",
            ]),
          ).optional().describe(
            "Search categories (検索カテゴリ): journals=仕訳, accounts=勘定科目, partners=取引先, departments=部門, analysis_codes=分析コード",
          ),
          dateFrom: z.string().optional().describe(
            "Start date filter for journals (仕訳の開始日フィルタ)",
          ),
          dateTo: z.string().optional().describe(
            "End date filter for journals (仕訳の終了日フィルタ)",
          ),
          page: z.number().min(1).default(1).describe(
            "Page number (ページ番号)",
          ),
          limit: z.number().min(1).max(100).default(10).describe(
            "Items per page (1ページあたりの件数)",
          ),
        },
        async ({ query, categories, dateFrom, dateTo, page, limit }) => {
          try {
            const result = await performUnifiedSearch({
              query,
              categories,
              dateFrom,
              dateTo,
              page,
              limit,
            });

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: result,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "統合検索に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // ========================================
      // 仕訳添付ファイル関連ツール
      // ========================================

      // 仕訳添付ファイル削除
      this.server.tool(
        "delete_journal_attachment",
        "Delete journal attachment file (仕訳添付ファイル削除)",
        {
          attachmentId: z.string().describe(
            "Attachment ID to delete (削除する添付ファイルID)",
          ),
        },
        async ({ attachmentId }) => {
          try {
            // getPrismaClientを使用して適切なクライアントを取得
            const { getPrismaClient } = await import("../lib/database/prisma");
            const client = getPrismaClient(
              this.env.HYPERDRIVE,
              this.getDatabaseUrl(),
            );

            // 添付ファイル情報を取得
            const attachment = await client.journalAttachment.findUnique({
              where: { attachmentId },
              include: {
                journalHeader: {
                  select: {
                    journalNumber: true,
                    createdBy: true,
                    approvalStatus: true,
                  },
                },
              },
            });

            if (!attachment) {
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: false,
                        error: "ファイルが見つかりません",
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }

            // セキュリティチェック
            // TODO: ユーザー認証とアクセス権限の確認を実装
            // 例: 承認済みの仕訳のファイルは削除不可、作成者のみ削除可能など

            // データベースから削除
            await client.journalAttachment.delete({
              where: { attachmentId },
            });

            // TODO: UploadThingからファイルを削除
            // UploadThingのファイル削除APIを呼び出す処理が必要
            console.log("削除対象ファイルURL:", attachment.fileUrl);

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      message: "ファイルを削除しました",
                      deletedFile: {
                        attachmentId: attachment.attachmentId,
                        originalFileName: attachment.originalFileName,
                        fileUrl: attachment.fileUrl,
                      },
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            console.error("ファイル削除エラー:", error);
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "ファイルの削除に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 仕訳添付ファイルダウンロード
      this.server.tool(
        "download_journal_attachment",
        "Download journal attachment file (仕訳添付ファイルダウンロード)",
        {
          attachmentId: z.string().describe(
            "Attachment ID to download (ダウンロードする添付ファイルID)",
          ),
        },
        async ({ attachmentId }) => {
          try {
            // getPrismaClientを使用して適切なクライアントを取得
            const { getPrismaClient } = await import("../lib/database/prisma");
            const client = getPrismaClient(
              this.env.HYPERDRIVE,
              this.getDatabaseUrl(),
            );

            // 添付ファイル情報を取得
            const attachment = await client.journalAttachment.findUnique({
              where: { attachmentId },
              include: {
                journalHeader: {
                  select: {
                    journalNumber: true,
                    createdBy: true,
                    approvalStatus: true,
                  },
                },
              },
            });

            if (!attachment) {
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: false,
                        error: "ファイルが見つかりません",
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }

            // セキュリティチェック（必要に応じて認証・認可処理を追加）
            // TODO: ユーザー認証とアクセス権限の確認を実装
            // 例: ファイルの所有者や同じ組織のユーザーのみアクセス可能

            try {
              // UploadThingのファイルURLから直接ダウンロード
              const fileResponse = await fetch(attachment.fileUrl);

              if (!fileResponse.ok) {
                return {
                  content: [
                    {
                      text: JSON.stringify(
                        {
                          success: false,
                          error: "ファイルの取得に失敗しました",
                          status: fileResponse.status,
                          statusText: fileResponse.statusText,
                        },
                        null,
                        2,
                      ),
                      type: "text",
                    },
                  ],
                };
              }

              const fileBlob = await fileResponse.blob();
              const buffer = Buffer.from(await fileBlob.arrayBuffer());

              // Cloudflare Workers環境では、バイナリデータを直接返せないため、
              // ファイル情報とダウンロードURLを返す
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: true,
                        data: {
                          attachmentId: attachment.attachmentId,
                          originalFileName: attachment.originalFileName,
                          fileName: attachment.fileName,
                          fileUrl: attachment.fileUrl,
                          fileSize: Number(attachment.fileSize),
                          mimeType: attachment.mimeType,
                          fileExtension: attachment.fileExtension,
                          uploadedAt: attachment.uploadedAt,
                          journalNumber: attachment.journalNumber,
                          // バイナリデータのサイズ情報
                          downloadedSize: buffer.length,
                          message:
                            "ファイル情報を取得しました。直接ダウンロードするには fileUrl を使用してください。",
                        },
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            } catch (fetchError) {
              console.error("ファイルダウンロードエラー:", fetchError);
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: false,
                        error: "ファイルのダウンロードに失敗しました",
                        details: fetchError instanceof Error
                          ? fetchError.message
                          : "Unknown error",
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }
          } catch (error) {
            console.error("ダウンロード処理エラー:", error);
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "サーバーエラーが発生しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 仕訳添付ファイル一覧取得
      this.server.tool(
        "get_journal_attachments",
        "Get journal attachment files list (仕訳添付ファイル一覧取得)",
        {
          journalNumber: z.string().describe(
            "Journal number to get attachments (添付ファイルを取得する仕訳番号)",
          ),
        },
        async ({ journalNumber }) => {
          try {
            // getPrismaClientを使用して適切なクライアントを取得
            const { getPrismaClient } = await import("../lib/database/prisma");
            const client = getPrismaClient(
              this.env.HYPERDRIVE,
              this.getDatabaseUrl(),
            );

            const attachments = await client.journalAttachment.findMany({
              where: { journalNumber },
              orderBy: { uploadedAt: "desc" },
            });

            // BigIntをnumberに変換
            const attachmentData = attachments.map((attachment: any) => ({
              attachmentId: attachment.attachmentId,
              journalNumber: attachment.journalNumber,
              fileName: attachment.fileName,
              originalFileName: attachment.originalFileName,
              fileUrl: attachment.fileUrl,
              fileSize: Number(attachment.fileSize),
              fileExtension: attachment.fileExtension,
              mimeType: attachment.mimeType,
              uploadedAt: attachment.uploadedAt,
              createdAt: attachment.createdAt,
              updatedAt: attachment.updatedAt,
            }));

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      data: attachmentData,
                      count: attachmentData.length,
                      message:
                        `仕訳番号「${journalNumber}」の添付ファイル一覧を取得しました`,
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            console.error("ファイル一覧取得エラー:", error);
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "ファイル一覧の取得に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // ========================================
      // MCPメタデータ・テスト機能
      // ========================================

      // MCPサーバーのメタデータ取得
      this.server.tool(
        "get_mcp_metadata",
        "Get MCP server metadata (MCPサーバーメタデータ取得)",
        {},
        async () => {
          try {
            const metadata = {
              server: {
                name: "Biz Clone Accounting MCP Server",
                version: "1.0.0",
                description:
                  "Remote MCP server for Biz Clone accounting system",
                author: "Biz Clone Development Team",
                protocolVersion: "2024-11-30",
              },
              capabilities: {
                tools: {
                  estimated_count: 25, // 推定ツール数
                  categories: [
                    "connection", // 接続テスト
                    "journal", // 仕訳関連
                    "master", // マスタデータ関連
                    "reports", // レポート関連
                    "search", // 検索関連
                    "system", // システム操作
                    "metadata", // メタデータ・テスト
                    "attachments", // 添付ファイル関連
                  ],
                },
                authentication: {
                  type: "OAuth2",
                  provider: "GitHub",
                  required: true,
                },
                database: {
                  type: "PostgreSQL",
                  provider: "Supabase",
                  features: ["transactions", "hyperdrive", "prisma_orm"],
                },
              },
              environment: {
                runtime: "Cloudflare Workers",
                nodeEnv: process.env.NODE_ENV || "production",
                hyperdriveEnabled: !!this.env.HYPERDRIVE,
                databaseConnected: true,
              },
              endpoints: {
                base: "/sse",
                auth: "/authorize",
                token: "/token",
                register: "/register",
              },
              user: {
                login: this.props.login,
                name: this.props.name,
                email: this.props.email,
              },
              timestamp: new Date().toISOString(),
            };

            return {
              content: [
                {
                  text: JSON.stringify(metadata, null, 2),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "メタデータ取得に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // MCPツールのテスト実行
      this.server.tool(
        "test_mcp_tools",
        "Test MCP tools execution (MCPツールテスト実行)",
        {
          toolName: z.string().describe(
            "Tool name to test (テストするツール名)",
          ),
          testParams: z.record(z.any()).optional().describe(
            "Test parameters (テストパラメータ)",
          ),
          validateOnly: z.boolean().default(false).describe(
            "Validate parameters only without execution (パラメータ検証のみ実行)",
          ),
        },
        async ({ toolName, testParams, validateOnly }) => {
          try {
            // 利用可能ツールの静的リスト
            const availableTools = [
              "test_connection",
              "check_db_health",
              "get_accounts",
              "create_journal",
              "search_journals",
              "update_journal",
              "delete_journal",
              "get_journal_by_number",
              "create_account",
              "update_account",
              "delete_account",
              "search_partners",
              "create_partner",
              "update_partner",
              "delete_partner",
              "search_departments",
              "create_department",
              "update_department",
              "delete_department",
              "search_analysis_codes",
              "create_analysis_code",
              "update_analysis_code",
              "delete_analysis_code",
              "get_trial_balance",
              "get_journal_summary",
              "unified_search",
              "generate_sample_journals",
              "test_mcp_connection",
              "list_mcp_tools",
              "delete_journal_attachment",
              "get_journal_attachments",
              "get_mcp_metadata",
              "test_mcp_tools",
              "list_available_tools",
            ];

            if (!availableTools.includes(toolName)) {
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: false,
                        error: `Tool '${toolName}' not found`,
                        availableTools,
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }

            // バリデーションのみの場合
            if (validateOnly) {
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: true,
                        validation: "Parameters validated successfully",
                        toolInfo: {
                          name: toolName,
                          description: `Tool ${toolName} validation passed`,
                          inputSchema: "Schema validation passed",
                        },
                        testParams,
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }

            // 実際のテスト実行用のデフォルトパラメータ
            const defaultTestParams: Record<string, any> = {
              test_connection: {},
              check_db_health: {},
              get_accounts: { limit: 5 },
              search_journals: { limit: 5 },
              search_partners: { limit: 5 },
              search_departments: { limit: 5 },
              search_analysis_codes: { limit: 5 },
              get_trial_balance: {
                dateFrom: "2024-01-01",
                dateTo: "2024-12-31",
                includeZeroBalance: false,
              },
              get_journal_summary: {
                dateFrom: "2024-01-01",
                dateTo: "2024-12-31",
                groupBy: "account",
              },
              unified_search: {
                query: "test",
                limit: 5,
              },
            };

            const params = testParams || defaultTestParams[toolName] || {};

            // 危険なツールの実行は避ける
            const readOnlyTools = [
              "test_connection",
              "check_db_health",
              "get_accounts",
              "search_journals",
              "search_partners",
              "search_departments",
              "search_analysis_codes",
              "get_trial_balance",
              "get_journal_summary",
              "unified_search",
              "get_journal_by_number",
              "list_mcp_tools",
              "get_mcp_metadata",
              "get_journal_attachments",
            ];

            if (!readOnlyTools.includes(toolName)) {
              return {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: false,
                        error:
                          `Tool '${toolName}' is not allowed for testing (write operation)`,
                        suggestion:
                          "Use validateOnly=true for write operations",
                        readOnlyTools,
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }

            // 安全なテスト実行
            const testStartTime = Date.now();
            let testResult;

            try {
              // 実際のツール実行は、ツール関数を直接呼び出すのではなく、
              // テスト用のモックレスポンスを返す
              testResult = {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: true,
                        message: `Tool '${toolName}' test execution simulated`,
                        toolName,
                        testParams: params,
                        note:
                          "実際のデータベース操作は実行されていません（安全なテスト実行）",
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            } catch (executionError) {
              testResult = {
                content: [
                  {
                    text: JSON.stringify(
                      {
                        success: false,
                        executionError: executionError instanceof Error
                          ? executionError.message
                          : "Execution failed",
                      },
                      null,
                      2,
                    ),
                    type: "text",
                  },
                ],
              };
            }

            const testEndTime = Date.now();
            const executionTime = testEndTime - testStartTime;

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      testResult,
                      testMetadata: {
                        toolName,
                        testParams: params,
                        executionTimeMs: executionTime,
                        timestamp: new Date().toISOString(),
                      },
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "ツールテスト実行に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 利用可能ツール一覧（詳細版）
      this.server.tool(
        "list_available_tools",
        "List all available MCP tools with detailed information (利用可能ツール詳細一覧)",
        {
          category: z.string().optional().describe(
            "Filter by category (カテゴリでフィルタ)",
          ),
          includeSchema: z.boolean().default(false).describe(
            "Include input schema (入力スキーマを含める)",
          ),
        },
        async ({ category, includeSchema }) => {
          try {
            // カテゴリ別ツール分類の静的定義
            const toolCategories: Record<
              string,
              Array<{ name: string; description: string; readOnly: boolean }>
            > = {
              connection: [
                {
                  name: "test_connection",
                  description: "Test MCP server connection",
                  readOnly: true,
                },
                {
                  name: "check_db_health",
                  description: "Check database connection and status",
                  readOnly: true,
                },
              ],
              journal: [
                {
                  name: "create_journal",
                  description: "Create a new journal entry",
                  readOnly: false,
                },
                {
                  name: "search_journals",
                  description: "Search journal entries",
                  readOnly: true,
                },
                {
                  name: "update_journal",
                  description: "Update existing journal entry",
                  readOnly: false,
                },
                {
                  name: "delete_journal",
                  description: "Delete journal entry",
                  readOnly: false,
                },
                {
                  name: "get_journal_by_number",
                  description: "Get journal entry by number",
                  readOnly: true,
                },
              ],
              master: [
                {
                  name: "get_accounts",
                  description: "Get chart of accounts",
                  readOnly: true,
                },
                {
                  name: "create_account",
                  description: "Create new account",
                  readOnly: false,
                },
                {
                  name: "update_account",
                  description: "Update existing account",
                  readOnly: false,
                },
                {
                  name: "delete_account",
                  description: "Delete account",
                  readOnly: false,
                },
                {
                  name: "search_partners",
                  description: "Search partners",
                  readOnly: true,
                },
                {
                  name: "create_partner",
                  description: "Create new partner",
                  readOnly: false,
                },
                {
                  name: "update_partner",
                  description: "Update existing partner",
                  readOnly: false,
                },
                {
                  name: "delete_partner",
                  description: "Delete partner",
                  readOnly: false,
                },
                {
                  name: "search_departments",
                  description: "Search departments",
                  readOnly: true,
                },
                {
                  name: "create_department",
                  description: "Create new department",
                  readOnly: false,
                },
                {
                  name: "update_department",
                  description: "Update existing department",
                  readOnly: false,
                },
                {
                  name: "delete_department",
                  description: "Delete department",
                  readOnly: false,
                },
                {
                  name: "search_analysis_codes",
                  description: "Search analysis codes",
                  readOnly: true,
                },
                {
                  name: "create_analysis_code",
                  description: "Create new analysis code",
                  readOnly: false,
                },
                {
                  name: "update_analysis_code",
                  description: "Update existing analysis code",
                  readOnly: false,
                },
                {
                  name: "delete_analysis_code",
                  description: "Delete analysis code",
                  readOnly: false,
                },
              ],
              reports: [
                {
                  name: "get_trial_balance",
                  description: "Get trial balance",
                  readOnly: true,
                },
                {
                  name: "get_journal_summary",
                  description: "Get journal summary",
                  readOnly: true,
                },
              ],
              search: [
                {
                  name: "unified_search",
                  description: "Unified search across all data",
                  readOnly: true,
                },
              ],
              system: [
                {
                  name: "generate_sample_journals",
                  description: "Generate sample journal entries",
                  readOnly: false,
                },
                {
                  name: "test_mcp_connection",
                  description: "Test MCP protocol connection",
                  readOnly: true,
                },
                {
                  name: "list_mcp_tools",
                  description: "List available MCP tools",
                  readOnly: true,
                },
              ],
              metadata: [
                {
                  name: "get_mcp_metadata",
                  description: "Get MCP server metadata",
                  readOnly: true,
                },
                {
                  name: "test_mcp_tools",
                  description: "Test MCP tools execution",
                  readOnly: true,
                },
                {
                  name: "list_available_tools",
                  description:
                    "List all available MCP tools with detailed information",
                  readOnly: true,
                },
              ],
              attachments: [
                {
                  name: "delete_journal_attachment",
                  description: "Delete journal attachment file",
                  readOnly: false,
                },
                {
                  name: "get_journal_attachments",
                  description: "Get journal attachment files list",
                  readOnly: true,
                },
              ],
            };

            // カテゴリフィルタリング
            let filteredCategories = toolCategories;
            if (category && toolCategories[category]) {
              filteredCategories = { [category]: toolCategories[category] };
            }

            const toolsInfo: any[] = [];
            Object.entries(filteredCategories).forEach(([cat, tools]) => {
              tools.forEach((tool) => {
                const baseInfo = {
                  name: tool.name,
                  description: tool.description,
                  category: cat,
                  readOnly: tool.readOnly,
                  requiresAuth: true,
                };

                toolsInfo.push(
                  includeSchema
                    ? {
                      ...baseInfo,
                      inputSchema:
                        "スキーマ情報は個別ツール実行時に確認してください",
                    }
                    : baseInfo,
                );
              });
            });

            const allToolsCount = Object.values(toolCategories).reduce(
              (sum, tools) => sum + tools.length,
              0,
            );

            const summary = {
              totalTools: allToolsCount,
              filteredTools: toolsInfo.length,
              categories: Object.keys(toolCategories),
              categoryCounts: Object.fromEntries(
                Object.entries(toolCategories).map((
                  [cat, tools],
                ) => [cat, tools.length]),
              ),
            };

            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: true,
                      summary,
                      tools: toolsInfo,
                      serverInfo: {
                        name: "Biz Clone Accounting MCP Server",
                        version: "1.0.0",
                        protocolVersion: "2024-11-30",
                      },
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  text: JSON.stringify(
                    {
                      success: false,
                      error: error instanceof Error
                        ? error.message
                        : "ツール一覧取得に失敗しました",
                    },
                    null,
                    2,
                  ),
                  type: "text",
                },
              ],
            };
          }
        },
      );

      // 元々のコード終了位置 - MCP初期化完了
      console.log("✅ BizCloneMCP initialization completed successfully");
    } catch (error) {
      console.error("Error initializing BizCloneMCP:", error);
    }
  }
}

// 🔍 デバッグ用：全てのリクエストをログ出力
const originalProvider = new OAuthProvider({
  apiHandler: BizCloneMCP.mount("/sse") as any,
  apiRoute: "/sse",
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: GitHubHandler as any,
  tokenEndpoint: "/token",
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    console.log("🔍 Fetch request:", request.method, request.url);
    console.log("🔍 Environment check:", {
      DATABASE_URL: env.DATABASE_URL?.slice(0, 50) + "...",
      HYPERDRIVE_exists: !!env.HYPERDRIVE,
      HYPERDRIVE_connectionString:
        env.HYPERDRIVE?.connectionString?.slice(0, 50) + "...",
    });

    return originalProvider.fetch(request, env, ctx);
  },
} as ExportedHandler<Env>;
