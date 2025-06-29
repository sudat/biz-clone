/**
 * MCP JSON-RPC 2.0 Endpoint
 * ============================================================================
 * Claude Web版との連携用MCPエンドポイント
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

// JSON-RPCリクエストの型定義
interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

// MCPツール定義（Claude Web版MCP仕様準拠）
const MCP_TOOLS = [
  {
    name: "save_journal",
    description:
      "新しい仕訳を保存します。会計仕訳データを受け取り、システムに保存します。",
    inputSchema: {
      type: "object",
      properties: {
        header: {
          type: "object",
          description: "仕訳ヘッダー情報",
          properties: {
            journalDate: {
              type: "string",
              description: "計上日 (YYYY-MM-DD形式)",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            },
            description: {
              type: "string",
              description: "摘要（仕訳の説明）",
              maxLength: 255,
            },
          },
          required: ["journalDate"],
          additionalProperties: false,
        },
        details: {
          type: "array",
          description: "仕訳明細のリスト（借方・貸方のペア）",
          items: {
            type: "object",
            properties: {
              debitCredit: {
                type: "string",
                enum: ["debit", "credit"],
                description: "借方(debit)または貸方(credit)",
              },
              accountCode: {
                type: "string",
                description: "勘定科目コード",
              },
              baseAmount: {
                type: "number",
                description: "基本金額（税抜き）",
                minimum: 0,
              },
              taxAmount: {
                type: "number",
                description: "税額",
                minimum: 0,
              },
              totalAmount: {
                type: "number",
                description: "合計金額（税込み）",
                minimum: 0,
              },
            },
            required: [
              "debitCredit",
              "accountCode",
              "baseAmount",
              "taxAmount",
              "totalAmount",
            ],
            additionalProperties: false,
          },
          minItems: 2,
        },
      },
      required: ["header", "details"],
      additionalProperties: false,
    },
  },
  {
    name: "search_journals",
    description:
      "仕訳データを検索します。条件に基づいて仕訳履歴を検索し、結果を返します。",
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: {
          type: "string",
          description: "検索キーワード（摘要や勘定科目名で検索）",
          maxLength: 100,
        },
        fromDate: {
          type: "string",
          description: "開始日 (YYYY-MM-DD形式)",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        toDate: {
          type: "string",
          description: "終了日 (YYYY-MM-DD形式)",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        page: {
          type: "number",
          default: 1,
          description: "ページ番号",
          minimum: 1,
        },
        limit: {
          type: "number",
          default: 20,
          description: "1ページあたりの件数",
          minimum: 1,
          maximum: 100,
        },
      },
      additionalProperties: false,
    },
  },
];

// CORSヘッダー設定
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

// ロギングユーティリティ
function logRequest(method: string, path: string, body: any, headers: any) {
  console.log("=== MCP Request Debug ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", method);
  console.log("Path:", path);
  console.log("Headers:", JSON.stringify(headers, null, 2));
  console.log("Body:", JSON.stringify(body, null, 2));
  console.log("========================");
}

function logResponse(status: number, body: any) {
  console.log("=== MCP Response Debug ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Status:", status);
  console.log("Body:", JSON.stringify(body, null, 2));
  console.log("=========================");
}

function logError(error: any, context: string) {
  console.error("=== MCP Error ===");
  console.error("Context:", context);
  console.error("Error Type:", error?.constructor?.name);
  console.error("Error Message:", error?.message);
  console.error("Error Stack:", error?.stack);
  console.error("Error Object:", error);
  console.error("=================");
}

export async function POST(request: NextRequest) {
  const requestHeaders = Object.fromEntries(request.headers.entries());
  let body: JsonRpcRequest | null = null;

  try {
    // リクエストボディを取得
    const rawBody = await request.text();
    console.log("Raw request body:", rawBody);

    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      logError(parseError, "JSON Parse Error");
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
            data: `Invalid JSON: ${
              parseError instanceof Error ? parseError.message : "Unknown error"
            }`,
          },
          id: null,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // リクエストをログ
    logRequest("POST", "/api", body, requestHeaders);

    // JSON-RPC 2.0の検証
    if (!body || body.jsonrpc !== "2.0") {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be "2.0"',
          data: { received: body?.jsonrpc || "undefined" },
        },
        id: body?.id || null,
      };
      logResponse(400, errorResponse);
      return NextResponse.json(errorResponse, {
        status: 400,
        headers: corsHeaders,
      });
    }

    // メソッドのルーティング
    console.log(`Processing method: ${body.method}`);
    let result;

    switch (body.method) {
      case "initialize":
        result = await handleInitialize(body.params);
        break;

      case "list_tools":
        result = await handleListTools();
        break;

      case "call_tool":
        result = await handleCallTool(body.params, request);
        break;

      case "list_resources":
        result = await handleListResources();
        break;

      default:
        const notFoundError = {
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${body.method}`,
            data: {
              availableMethods: [
                "initialize",
                "list_tools",
                "call_tool",
                "list_resources",
              ],
            },
          },
          id: body.id,
        };
        logResponse(404, notFoundError);
        return NextResponse.json(notFoundError, {
          status: 404,
          headers: corsHeaders,
        });
    }

    const successResponse = {
      jsonrpc: "2.0",
      result,
      id: body.id,
    };

    logResponse(200, successResponse);
    return NextResponse.json(successResponse, { headers: corsHeaders });
  } catch (error) {
    logError(error, "Unhandled Error in POST handler");
    const errorResponse = {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
      id: body?.id || null,
    };
    logResponse(500, errorResponse);
    return NextResponse.json(errorResponse, {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// OPTIONSメソッドのハンドラー（CORS対応）
export async function OPTIONS(request: NextRequest) {
  const requestHeaders = Object.fromEntries(request.headers.entries());
  logRequest("OPTIONS", "/api", null, requestHeaders);

  const response = new Response(null, {
    status: 200,
    headers: corsHeaders,
  });

  logResponse(200, "OPTIONS response with CORS headers");
  return response;
}

// GETメソッドのハンドラー（デバッグ用）
export async function GET(request: NextRequest) {
  const requestHeaders = Object.fromEntries(request.headers.entries());
  logRequest("GET", "/api", null, requestHeaders);

  const debugInfo = {
    status: "MCP endpoint is running",
    timestamp: new Date().toISOString(),
    availableMethods: [
      "initialize",
      "list_tools",
      "call_tool",
      "list_resources",
    ],
    corsEnabled: true,
    endpoint: "/api",
    protocol: "JSON-RPC 2.0",
  };

  logResponse(200, debugInfo);
  return NextResponse.json(debugInfo, { headers: corsHeaders });
}

// 初期化ハンドラー
async function handleInitialize(params: any) {
  console.log("Handling initialize with params:", params);

  // クライアントから送られてきたバージョンを尊重する
  const clientProtocolVersion = params?.protocolVersion || "2025-03-26";

  const result = {
    protocolVersion: clientProtocolVersion,
    capabilities: {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: false,
        listChanged: false,
      },
      prompts: {
        listChanged: false,
      },
      logging: {},
      // Claude Web版用の認証サポート
      auth: {
        oauth: true,
        // 簡易認証として、認証なしでもアクセス可能にする
        anonymous: true,
      },
    },
    serverInfo: {
      name: "biz-clone-mcp-server",
      version: "1.0.0",
    },
    // Claude Web版用の追加情報
    implementation: {
      name: "biz-clone-mcp-server",
      version: "1.0.0",
    },
  };
  console.log("Initialize result:", result);
  return result;
}

// ツール一覧ハンドラー
async function handleListTools() {
  console.log("Handling list_tools");
  const result = {
    tools: MCP_TOOLS.map((tool) => ({
      ...tool,
      // Claude Web版用の追加メタデータ
      annotations: {
        audience: ["user"],
        level: "beginner",
      },
    })),
    // Claude Web版用のメタデータ
    _meta: {
      description: "biz-clone会計システムのMCPツール",
      version: "1.0.0",
      author: "biz-clone team",
    },
  };
  console.log(`Returning ${MCP_TOOLS.length} tools`);
  return result;
}

// リソース一覧ハンドラー
async function handleListResources() {
  console.log("Handling list_resources");
  const result = {
    resources: [
      {
        uri: "biz-clone://accounting/schema",
        name: "会計スキーマ",
        description: "biz-cloneシステムの会計データスキーマ情報",
        mimeType: "application/json",
      },
      {
        uri: "biz-clone://accounting/docs",
        name: "API仕様書",
        description: "会計APIの利用方法とサンプル",
        mimeType: "text/markdown",
      },
    ],
  };
  console.log("Returning resources");
  return result;
}

// ツール実行ハンドラー
async function handleCallTool(params: any, request: NextRequest) {
  console.log("Handling call_tool with params:", params);
  const { name, arguments: args } = params || {};

  if (!name) {
    throw new Error("Tool name is required");
  }

  // ツールの検証
  const tool = MCP_TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  console.log(`Executing tool: ${name} with arguments:`, args);

  // 実際のAPIエンドポイントを呼び出す
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let endpoint: string;
  let method: string;

  switch (name) {
    case "save_journal":
      endpoint = `${baseUrl}/api/journal`;
      method = "POST";
      break;

    case "search_journals":
      // GETリクエストの場合はクエリパラメータを構築
      const searchParams = new URLSearchParams();
      if (args?.searchTerm) searchParams.append("searchTerm", args.searchTerm);
      if (args?.fromDate) searchParams.append("fromDate", args.fromDate);
      if (args?.toDate) searchParams.append("toDate", args.toDate);
      if (args?.page) searchParams.append("page", args.page.toString());
      if (args?.limit) searchParams.append("limit", args.limit.toString());

      endpoint = `${baseUrl}/api/journal${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`;
      method = "GET";
      break;

    default:
      throw new Error(`Tool implementation not found: ${name}`);
  }

  // 認証ヘッダーの転送
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
    console.log("Forwarding Authorization header");
  }

  console.log(`Calling API: ${method} ${endpoint}`);

  try {
    // APIリクエストの実行
    const response = await fetch(endpoint, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(args) : undefined,
    });

    const responseText = await response.text();
    console.log(`API Response Status: ${response.status}`);
    console.log(`API Response Body: ${responseText}`);

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (apiError) {
    logError(apiError, `Tool execution failed: ${name}`);
    throw apiError;
  }
}
