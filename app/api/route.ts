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

// MCPツール定義
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
        searchTerm: { type: "string" },
        fromDate: { type: "string" },
        toDate: { type: "string" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
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

export async function POST(request: NextRequest) {
  try {
    const body: JsonRpcRequest = await request.json();

    // JSON-RPC 2.0の検証
    if (body.jsonrpc !== "2.0") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: 'Invalid Request: jsonrpc must be "2.0"',
          },
          id: body.id || null,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // メソッドのルーティング
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
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: `Method not found: ${body.method}`,
            },
            id: body.id,
          },
          { status: 404, headers: corsHeaders },
        );
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        result,
        id: body.id,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("MCP JSON-RPC Error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
        id: null,
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

// OPTIONSメソッドのハンドラー（CORS対応）
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// 初期化ハンドラー
async function handleInitialize(params: any) {
  return {
    protocolVersion: "0.1.0",
    capabilities: {
      tools: {},
      sse: {
        endpoint: "/sse",
      },
    },
    serverInfo: {
      name: "biz-clone-mcp-server",
      version: "1.0.0",
    },
  };
}

// ツール一覧ハンドラー
async function handleListTools() {
  return {
    tools: MCP_TOOLS,
  };
}

// ツール実行ハンドラー
async function handleCallTool(params: any, request: NextRequest) {
  const { name, arguments: args } = params;

  // ツールの検証
  const tool = MCP_TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

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
      endpoint = `${baseUrl}/api/journal`;
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
  }

  // APIリクエストの実行
  const response = await fetch(endpoint, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(args) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API call failed: ${error}`);
  }

  const result = await response.json();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
