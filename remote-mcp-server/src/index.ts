import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { Octokit } from "octokit";
import { z } from "zod";
import { GitHubHandler } from "./github-handler";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
};

// Environment bindings for Cloudflare Workers
interface Env {
  OAUTH_KV: KVNamespace;
  DB: D1Database; // Cloudflare D1 database for accounting data
  AI: Ai;
  GITHUB_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  MCP_OBJECT: DurableObjectNamespace;
}

// GitHub users who have access to accounting tools
// 認証済みGitHubユーザーは全員アクセス可能
// const ALLOWED_GITHUB_USERS = new Set<string>([
//   // 必要に応じて特定ユーザーのみに制限する場合はここにユーザー名を追加
// ]);

export class BizCloneMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Biz Clone Accounting MCP Server",
    version: "1.0.0",
  });

  async init() {
    // ====================
    // Basic Tools
    // ====================

    // Hello, world! - Basic connectivity test
    this.server.tool("test_connection", "Test MCP server connection", {}, async () => ({
      content: [
        {
          text: `Connection successful! User: ${this.props.login} (${this.props.name})`,
          type: "text",
        },
      ],
    }));

    // Get authenticated GitHub user info
    this.server.tool("get_user_info", "Get authenticated GitHub user information", {}, async () => {
      const octokit = new Octokit({ auth: this.props.accessToken });
      const user = await octokit.rest.users.getAuthenticated();
      return {
        content: [
          {
            text: JSON.stringify(
              {
                login: user.data.login,
                name: user.data.name,
                email: user.data.email,
                avatar_url: user.data.avatar_url,
                company: user.data.company,
                location: user.data.location,
              },
              null,
              2,
            ),
            type: "text",
          },
        ],
      };
    });

    // ====================
    // Accounting Tools (All authenticated GitHub users can access)
    // ====================

    // Database health check
    this.server.tool("check_db_health", "Check database connection and status", {}, async () => {
      try {
        const result = await this.env.DB.prepare("SELECT 1 as test").first();
        return {
          content: [
            {
              text: JSON.stringify(
                {
                  status: "connected",
                  database_type: "D1",
                  test_query: "successful",
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
                  status: "error",
                  error: error instanceof Error ? error.message : "Unknown error",
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
    });

    // Get chart of accounts
    this.server.tool(
      "get_accounts",
      "Get chart of accounts (勘定科目一覧)",
      {
        searchTerm: z.string().optional().describe("Search term for account name or code"),
        accountType: z.string().optional().describe("Filter by account type (資産/負債/純資産/収益/費用)"),
        limit: z.number().min(1).max(100).default(50).describe("Maximum number of accounts to return"),
      },
      async ({ searchTerm, accountType, limit }) => {
        try {
          let query = "SELECT * FROM account_master WHERE is_active = 1";
          const params: any[] = [];

          if (searchTerm) {
            query += " AND (account_code LIKE ? OR account_name LIKE ?)";
            params.push(`%${searchTerm}%`, `%${searchTerm}%`);
          }

          if (accountType) {
            query += " AND account_type = ?";
            params.push(accountType);
          }

          query += " ORDER BY account_code LIMIT ?";
          params.push(limit);

          const { results } = await this.env.DB.prepare(query)
            .bind(...params)
            .all();

          return {
            content: [
              {
                text: JSON.stringify(
                  {
                    success: true,
                    data: results,
                    count: results?.length || 0,
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
                    error: error instanceof Error ? error.message : "Failed to fetch accounts",
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

    // Create new journal entry
    this.server.tool(
      "create_journal",
      "Create a new journal entry (仕訳作成)",
      {
        journalDate: z.string().describe("Journal date in YYYY-MM-DD format"),
        description: z.string().describe("Journal description (摘要)"),
        details: z
          .array(
            z.object({
              debitCredit: z.enum(["debit", "credit"]).describe("Debit or Credit"),
              accountCode: z.string().describe("Account code (勘定科目コード)"),
              amount: z.number().describe("Amount"),
              description: z.string().optional().describe("Line description"),
            }),
          )
          .min(2)
          .describe("Journal entry details (minimum 2 lines)"),
      },
      async ({ journalDate, description, details }) => {
        try {
          // Validate balanced entry
          const debitTotal = details.filter((d) => d.debitCredit === "debit").reduce((sum, d) => sum + d.amount, 0);
          const creditTotal = details.filter((d) => d.debitCredit === "credit").reduce((sum, d) => sum + d.amount, 0);

          if (Math.abs(debitTotal - creditTotal) > 0.01) {
            throw new Error(`Journal entry is not balanced. Debit: ${debitTotal}, Credit: ${creditTotal}`);
          }

          // Generate journal number
          const dateStr = new Date(journalDate).toISOString().slice(0, 10).replace(/-/g, "");
          const timestamp = Date.now().toString().slice(-6);
          const journalNumber = `${dateStr}${timestamp}`;

          // Begin transaction
          const batch = [
            // Insert header
            this.env.DB.prepare(
              `
								INSERT INTO journal_header (journal_number, journal_date, description, total_amount, created_by, created_at)
								VALUES (?, ?, ?, ?, ?, datetime('now'))
							`,
            ).bind(journalNumber, journalDate, description, debitTotal, this.props.login),

            // Insert details
            ...details.map((detail, index) =>
              this.env.DB.prepare(
                `
									INSERT INTO journal_detail (journal_number, line_number, debit_credit, account_code, amount, description, created_by, created_at)
									VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
								`,
              ).bind(
                journalNumber,
                index + 1,
                detail.debitCredit === "debit" ? "D" : "C",
                detail.accountCode,
                detail.amount,
                detail.description || null,
                this.props.login,
              ),
            ),
          ];

          const results = await this.env.DB.batch(batch);

          // Check if all operations succeeded
          const success = results.every((result) => result.success);

          if (!success) {
            throw new Error("Failed to create journal entry");
          }

          return {
            content: [
              {
                text: JSON.stringify(
                  {
                    success: true,
                    data: {
                      journalNumber,
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
          return {
            content: [
              {
                text: JSON.stringify(
                  {
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to create journal entry",
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
        journalNumber: z.string().optional().describe("Journal number to search"),
        dateFrom: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        dateTo: z.string().optional().describe("End date (YYYY-MM-DD)"),
        accountCode: z.string().optional().describe("Account code to filter"),
        description: z.string().optional().describe("Description to search"),
        limit: z.number().min(1).max(100).default(20).describe("Maximum number of entries to return"),
      },
      async ({ journalNumber, dateFrom, dateTo, accountCode, description, limit }) => {
        try {
          let query = `
							SELECT h.*, 
								   GROUP_CONCAT(d.account_code || ':' || d.debit_credit || ':' || d.amount, '|') as details
							FROM journal_header h
							LEFT JOIN journal_detail d ON h.journal_number = d.journal_number
							WHERE 1=1
						`;
          const params: any[] = [];

          if (journalNumber) {
            query += " AND h.journal_number LIKE ?";
            params.push(`%${journalNumber}%`);
          }

          if (dateFrom) {
            query += " AND h.journal_date >= ?";
            params.push(dateFrom);
          }

          if (dateTo) {
            query += " AND h.journal_date <= ?";
            params.push(dateTo);
          }

          if (accountCode) {
            query += " AND EXISTS (SELECT 1 FROM journal_detail WHERE journal_number = h.journal_number AND account_code LIKE ?)";
            params.push(`%${accountCode}%`);
          }

          if (description) {
            query += " AND h.description LIKE ?";
            params.push(`%${description}%`);
          }

          query += " GROUP BY h.journal_number ORDER BY h.journal_date DESC, h.journal_number DESC LIMIT ?";
          params.push(limit);

          const { results } = await this.env.DB.prepare(query)
            .bind(...params)
            .all();

          return {
            content: [
              {
                text: JSON.stringify(
                  {
                    success: true,
                    data: results,
                    count: results?.length || 0,
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
                    error: error instanceof Error ? error.message : "Failed to search journals",
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

    // Get trial balance
    this.server.tool(
      "get_trial_balance",
      "Get trial balance (試算表)",
      {
        dateFrom: z.string().describe("Start date (YYYY-MM-DD)"),
        dateTo: z.string().describe("End date (YYYY-MM-DD)"),
        accountType: z.string().optional().describe("Filter by account type"),
      },
      async ({ dateFrom, dateTo, accountType }) => {
        try {
          let query = `
							SELECT 
								a.account_code,
								a.account_name,
								a.account_type,
								COALESCE(SUM(CASE WHEN d.debit_credit = 'D' THEN d.amount ELSE 0 END), 0) as debit_total,
								COALESCE(SUM(CASE WHEN d.debit_credit = 'C' THEN d.amount ELSE 0 END), 0) as credit_total,
								COALESCE(SUM(CASE WHEN d.debit_credit = 'D' THEN d.amount ELSE -d.amount END), 0) as balance
							FROM account_master a
							LEFT JOIN journal_detail d ON a.account_code = d.account_code
							LEFT JOIN journal_header h ON d.journal_number = h.journal_number AND h.journal_date BETWEEN ? AND ?
							WHERE a.is_active = 1
						`;

          const params: any[] = [dateFrom, dateTo];

          if (accountType) {
            query += " AND a.account_type = ?";
            params.push(accountType);
          }

          query += " GROUP BY a.account_code, a.account_name, a.account_type ORDER BY a.account_code";

          const { results } = await this.env.DB.prepare(query)
            .bind(...params)
            .all();

          return {
            content: [
              {
                text: JSON.stringify(
                  {
                    success: true,
                    data: {
                      period: { from: dateFrom, to: dateTo },
                      accounts: results,
                      totals: {
                        debit: results?.reduce((sum: number, acc: any) => sum + (acc.debit_total || 0), 0) || 0,
                        credit: results?.reduce((sum: number, acc: any) => sum + (acc.credit_total || 0), 0) || 0,
                      },
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
                    error: error instanceof Error ? error.message : "Failed to generate trial balance",
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
  }
}

export default new OAuthProvider({
  apiHandler: BizCloneMCP.mount("/sse") as any,
  apiRoute: "/sse",
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: GitHubHandler as any,
  tokenEndpoint: "/token",
});
