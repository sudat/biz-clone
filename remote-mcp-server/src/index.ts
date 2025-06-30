import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { Octokit } from "octokit";
import { z } from "zod";
import { GitHubHandler } from "./github-handler";
import { prisma } from "../lib/database/prisma";

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
}

export class BizCloneMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Biz Clone Accounting MCP Server",
    version: "1.0.0",
  });

  async init() {
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
          await prisma.$queryRaw`SELECT 1 as test`;
          const accountCount = await prisma.account.count();
          return {
            content: [
              {
                text: JSON.stringify(
                  {
                    status: "connected",
                    database_type: "Supabase PostgreSQL",
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

          const accounts = await prisma.account.findMany({
            where,
            orderBy: { accountCode: "asc" },
            take: limit,
          });

          return {
            content: [
              {
                text: JSON.stringify(
                  {
                    success: true,
                    data: accounts,
                    count: accounts.length,
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
          const debitTotal = details.filter((d) => d.debitCredit === "debit")
            .reduce((sum, d) => sum + d.amount, 0);
          const creditTotal = details.filter((d) => d.debitCredit === "credit")
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

          const result = await prisma.$transaction(async (tx) => {
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

          const journals = await prisma.journalHeader.findMany({
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
