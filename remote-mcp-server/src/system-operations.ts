/**
 * System Operations for Remote MCP Server
 * ============================================================================
 * システム関連機能（サンプル仕訳生成、MCP接続テスト、ツール一覧）
 * ============================================================================
 */

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// ====================
// ユーティリティ関数
// ====================

/**
 * 配列からランダムな要素を選択
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 指定範囲内のランダムな整数を生成
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * ランダムな日付を生成（指定範囲内）
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * シンプルなランダム摘要を生成
 */
function generateRandomDescription(): string {
  const prefixes = ["売上", "仕入", "経費", "支払", "入金", "振込", "購入"];
  const suffixes = ["取引", "処理", "支払い", "入金", "決済", "手数料", "代金"];
  
  return `${randomChoice(prefixes)}${randomChoice(suffixes)}`;
}

// ====================
// バリデーションスキーマ
// ====================

/**
 * サンプル仕訳生成リクエストスキーマ
 */
export const generateJournalsSchema = z.object({
  count: z.number().min(1).max(10000).default(1000).describe("生成する仕訳数"),
  clearExisting: z.boolean().default(false).describe("既存データをクリアするか"),
});

/**
 * MCP接続テストレスポンススキーマ
 */
export const mcpTestResponseSchema = z.object({
  jsonrpc: z.string(),
  method: z.string(),
  params: z.record(z.any()),
  timestamp: z.string(),
  status: z.string(),
  server: z.string(),
  version: z.string(),
  capabilities: z.object({
    tools: z.record(z.any()),
  }),
  testData: z.object({
    requestReceived: z.boolean(),
    parsedBody: z.any(),
    environment: z.string().optional(),
  }),
});

// ====================
// 型定義
// ====================

export type GenerateJournalsRequest = z.infer<typeof generateJournalsSchema>;
export type McpTestResponse = z.infer<typeof mcpTestResponseSchema>;

export interface McpTool {
  name: string;
  description: string;
  category: string;
  method: string;
  endpoint: string;
  input_schema?: any;
}

export interface McpToolsResponse {
  tools: McpTool[];
  categories: string[];
  authentication: {
    type: string;
    scopes: string[];
  };
  base_url: string;
  version: string;
}

// ====================
// システム操作クラス
// ====================

export class SystemOperations {
  constructor(private prisma: PrismaClient) {}

  /**
   * サンプル仕訳を生成する
   */
  async generateSampleJournals(request: GenerateJournalsRequest): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> {
    const { count, clearExisting } = request;

    try {
      // 本番環境では実行しない
      if (process.env.NODE_ENV === "production") {
        throw new Error("本番環境ではサンプル仕訳生成は実行できません");
      }

      // 既存データのクリア
      if (clearExisting) {
        console.log("既存の仕訳データをクリアしています...");
        await this.prisma.$transaction([
          this.prisma.journalDetail.deleteMany({}),
          this.prisma.journalHeader.deleteMany({}),
        ]);
        console.log("✔ 既存の仕訳データをクリアしました");
      }

      // 借方・貸方候補の勘定科目を取得
      const accounts = await this.prisma.account.findMany({
        where: { isActive: true, isDetail: true, isTaxAccount: false },
        select: {
          accountCode: true,
          accountType: true,
          defaultTaxCode: true,
        },
      });

      if (accounts.length < 2) {
        throw new Error(
          "勘定科目マスタに十分なデータがありません。先にマスタデータを投入してください。"
        );
      }

      const debitCandidates = accounts.filter((a) =>
        ["資産", "費用"].includes(a.accountType)
      );
      const creditCandidates = accounts.filter((a) =>
        ["負債", "収益"].includes(a.accountType)
      );

      if (debitCandidates.length === 0 || creditCandidates.length === 0) {
        throw new Error("借方／貸方の候補勘定科目が不足しています。");
      }

      console.time(`generateSampleJournals(${count})`);

      for (let i = 0; i < count; i++) {
        const baseAmount = randomInt(1000, 100000);
        
        const debitAccount = randomChoice(debitCandidates);
        const creditAccount = randomChoice(creditCandidates);

        // 10%固定の消費税
        const taxRateDecimal = 0.1;
        const taxAmount = Math.round(baseAmount * taxRateDecimal);
        const totalAmount = baseAmount + taxAmount;

        // 仕訳日付を生成（今年の範囲内でランダム）
        const currentYear = new Date().getFullYear();
        const journalDate = randomDate(
          new Date(`${currentYear}-01-01`),
          new Date(`${currentYear}-12-31`)
        );

        // 仕訳番号生成（YYYYMMDD + 7桁連番の簡易版）
        const dateStr = journalDate.toISOString().slice(0, 10).replace(/-/g, "");
        const timestamp = Date.now().toString().slice(-7);
        const journalNumber = `${dateStr}${timestamp}`;

        await this.prisma.$transaction([
          this.prisma.journalHeader.create({
            data: {
              journalNumber,
              journalDate,
              description: generateRandomDescription(),
              totalAmount: totalAmount,
            },
          }),
          this.prisma.journalDetail.createMany({
            data: [
              {
                journalNumber,
                lineNumber: 1,
                debitCredit: "D",
                accountCode: debitAccount.accountCode,
                baseAmount: baseAmount,
                taxAmount: taxAmount,
                totalAmount: totalAmount,
                taxCode: debitAccount.defaultTaxCode ?? null,
              },
              {
                journalNumber,
                lineNumber: 2,
                debitCredit: "C",
                accountCode: creditAccount.accountCode,
                baseAmount: baseAmount,
                taxAmount: taxAmount,
                totalAmount: totalAmount,
                taxCode: creditAccount.defaultTaxCode ?? null,
              },
            ],
          }),
        ]);

        // 進捗表示
        if ((i + 1) % 10 === 0 || i === count - 1) {
          console.log(`進捗: ${i + 1}/${count} 件完了`);
        }
      }

      console.timeEnd(`generateSampleJournals(${count})`);

      return {
        success: true,
        count,
        message: `${count}件のサンプル仕訳を生成しました`,
      };
    } catch (error) {
      console.error("generateSampleJournals error:", error);
      throw error;
    }
  }

  /**
   * MCP接続テストを実行する
   */
  async testMcpConnection(requestBody?: any): Promise<McpTestResponse> {
    try {
      const testResponse: McpTestResponse = {
        jsonrpc: "2.0",
        method: requestBody?.method || "test",
        params: requestBody?.params || {},
        timestamp: new Date().toISOString(),
        status: "MCP connection successful",
        server: "biz-clone-accounting-mcp",
        version: "1.0.0",
        capabilities: {
          tools: {},
        },
        testData: {
          requestReceived: true,
          parsedBody: requestBody || {},
          environment: process.env.NODE_ENV,
        },
      };

      return testResponse;
    } catch (error) {
      console.error("MCP Test Error:", error);
      throw new Error(`MCP接続テストに失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * 利用可能なMCPツール一覧を取得する
   */
  async listMcpTools(): Promise<McpToolsResponse> {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      const tools: McpTool[] = [
        // システムツール
        {
          name: "generate_sample_journals",
          description: "開発用のサンプル仕訳を大量生成します",
          category: "system",
          method: "POST",
          endpoint: `${baseUrl}/api/dev/generate-journals`,
          input_schema: {
            type: "object",
            properties: {
              count: { type: "number", minimum: 1, maximum: 10000, default: 1000 },
              clearExisting: { type: "boolean", default: false },
            },
          },
        },
        {
          name: "test_mcp_connection",
          description: "MCP接続の動作確認を行います",
          category: "system",
          method: "POST",
          endpoint: `${baseUrl}/api/mcp/test`,
          input_schema: {
            type: "object",
            properties: {
              jsonrpc: { type: "string", default: "2.0" },
              method: { type: "string", default: "test" },
              params: { type: "object", default: {} },
              id: { type: ["string", "number", "null"], default: 1 },
            },
          },
        },
        {
          name: "list_mcp_tools",
          description: "利用可能なMCPツール一覧を取得します",
          category: "system",
          method: "GET",
          endpoint: `${baseUrl}/api/mcp/tools`,
        },

        // 仕訳ツール
        {
          name: "save_journal",
          description: "新しい仕訳を保存します",
          category: "journal",
          method: "POST",
          endpoint: `${baseUrl}/api/journal`,
          input_schema: {
            type: "object",
            properties: {
              header: {
                type: "object",
                properties: {
                  journalDate: { type: "string", description: "計上日 (YYYY-MM-DD形式)" },
                  description: { type: "string", description: "摘要" },
                },
                required: ["journalDate"],
              },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    debitCredit: { type: "string", enum: ["debit", "credit"] },
                    accountCode: { type: "string" },
                    baseAmount: { type: "number" },
                    taxAmount: { type: "number" },
                    totalAmount: { type: "number" },
                  },
                  required: ["debitCredit", "accountCode", "baseAmount", "taxAmount", "totalAmount"],
                },
                minItems: 2,
              },
            },
            required: ["header", "details"],
          },
        },
        {
          name: "search_journals",
          description: "仕訳を検索します",
          category: "journal",
          method: "GET",
          endpoint: `${baseUrl}/api/journal`,
          input_schema: {
            type: "object",
            properties: {
              searchTerm: { type: "string" },
              fromDate: { type: "string" },
              toDate: { type: "string" },
              page: { type: "number", default: 1 },
              limit: { type: "number", default: 20 },
            },
          },
        },

        // マスタデータツール
        {
          name: "search_accounts",
          description: "勘定科目を検索します",
          category: "master",
          method: "GET",
          endpoint: `${baseUrl}/api/master/accounts`,
        },
        {
          name: "search_partners",
          description: "取引先を検索します",
          category: "master",
          method: "GET",
          endpoint: `${baseUrl}/api/master/partners`,
        },
        {
          name: "search_analysis_codes",
          description: "分析コードを検索します",
          category: "master",
          method: "GET",
          endpoint: `${baseUrl}/api/master/analysis-codes`,
        },

        // 検索・分析ツール
        {
          name: "unified_search",
          description: "全データを横断検索します",
          category: "search",
          method: "GET",
          endpoint: `${baseUrl}/api/search/unified`,
        },
        {
          name: "get_trial_balance",
          description: "試算表を取得します",
          category: "reports",
          method: "GET",
          endpoint: `${baseUrl}/api/reports/trial-balance`,
        },
      ];

      return {
        tools,
        categories: ["system", "journal", "master", "search", "reports"],
        authentication: {
          type: "Bearer",
          scopes: ["mcp:read", "mcp:write", "mcp:admin"],
        },
        base_url: baseUrl,
        version: "1.0.0",
      };
    } catch (error) {
      console.error("List MCP Tools Error:", error);
      throw new Error(`MCPツール一覧の取得に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

// ====================
// エラーハンドリング
// ====================

export class SystemOperationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "SystemOperationError";
  }
}

/**
 * システム操作のエラーハンドラー
 */
export function handleSystemOperationError(error: unknown): {
  success: false;
  error: string;
  code?: string;
} {
  if (error instanceof SystemOperationError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: "Unknown system operation error",
  };
}