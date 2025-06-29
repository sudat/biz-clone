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
    description: "新しい仕訳を保存します",
    inputSchema: {
      type: "object",
      properties: {
        header: {
          type: "object",
          properties: {
            journalDate: {
              type: "string",
              description: "計上日 (YYYY-MM-DD形式)",
            },
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
            required: [
              "debitCredit",
              "accountCode",
              "baseAmount",
              "taxAmount",
              "totalAmount",
            ],
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
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: { type: "string", description: "検索キーワード" },
        fromDate: { type: "string", description: "開始日 (YYYY-MM-DD形式)" },
        toDate: { type: "string", description: "終了日 (YYYY-MM-DD形式)" },
        page: { type: "number", default: 1, description: "ページ番号" },
        limit: {
          type: "number",
          default: 20,
          description: "1ページあたりの件数",
        },
      },
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

      default:
        const notFoundError = {
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${body.method}`,
            data: {
              availableMethods: ["initialize", "list_tools", "call_tool"],
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
    availableMethods: ["initialize", "list_tools", "call_tool"],
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
  const clientProtocolVersion = params?.protocolVersion || "2024-11-05";

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
    },
    serverInfo: {
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
    tools: MCP_TOOLS,
  };
  console.log(`Returning ${MCP_TOOLS.length} tools`);
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
