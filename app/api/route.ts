/**
 * MCP JSON-RPC 2.0 Endpoint
 * ============================================================================
 * Claude Web版との連携用MCPエンドポイント
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// OAuth 2.0 Dynamic Client Registration のサポート
const OAUTH_CLIENTS = new Map<string, {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  client_name: string;
  created_at: number;
}>();

// 認証コードの一時保存
const AUTH_CODES = new Map<string, {
  code: string;
  client_id: string;
  redirect_uri: string;
  expires_at: number;
  user_id: string;
}>();

// アクセストークンの管理
const ACCESS_TOKENS = new Map<string, {
  token: string;
  client_id: string;
  user_id: string;
  scope: string[];
  expires_at: number;
}>();

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

// OAuth 2.0 Well-Known Endpoint
async function handleWellKnownOAuth() {
  const baseUrl = process.env.NEXTAUTH_URL || "https://biz-clone.vercel.app";

  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    registration_endpoint: `${baseUrl}/api/oauth/register`,
    scopes_supported: ["read", "write", "claudeai"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
    ],
    code_challenge_methods_supported: ["S256"],
  };
}

// OAuth 2.0 Dynamic Client Registration
async function handleClientRegistration(body: any) {
  console.log("Handling client registration:", body);

  const client_id = `mcp_${crypto.randomBytes(16).toString("hex")}`;
  const client_secret = crypto.randomBytes(32).toString("hex");

  const client = {
    client_id,
    client_secret,
    redirect_uris: body.redirect_uris || [],
    client_name: body.client_name || "MCP Client",
    created_at: Date.now(),
  };

  OAUTH_CLIENTS.set(client_id, client);

  console.log("Client registered:", {
    client_id,
    client_name: client.client_name,
  });

  return {
    client_id,
    client_secret,
    client_id_issued_at: Math.floor(client.created_at / 1000),
    redirect_uris: client.redirect_uris,
    client_name: client.client_name,
  };
}

// OAuth 2.0 Authorization Endpoint
async function handleOAuthAuthorize(searchParams: URLSearchParams) {
  console.log(
    "Handling OAuth authorize:",
    Object.fromEntries(searchParams.entries()),
  );

  const client_id = searchParams.get("client_id");
  const redirect_uri = searchParams.get("redirect_uri");
  const response_type = searchParams.get("response_type");
  const scope = searchParams.get("scope");
  const state = searchParams.get("state");
  const code_challenge = searchParams.get("code_challenge");
  const code_challenge_method = searchParams.get("code_challenge_method");

  if (!client_id || !redirect_uri || response_type !== "code") {
    throw new Error("Invalid authorization request");
  }

  const client = OAUTH_CLIENTS.get(client_id);
  if (!client) {
    throw new Error("Invalid client_id");
  }

  if (!client.redirect_uris.includes(redirect_uri)) {
    throw new Error("Invalid redirect_uri");
  }

  // 簡易認証（実際の実装では適切なユーザー認証が必要）
  const user_id = "anonymous_user";
  const code = crypto.randomBytes(32).toString("hex");

  AUTH_CODES.set(code, {
    code,
    client_id,
    redirect_uri,
    expires_at: Date.now() + 600000, // 10分
    user_id,
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  console.log(
    "Authorization code generated, redirecting to:",
    redirectUrl.toString(),
  );

  return redirectUrl.toString();
}

// OAuth 2.0 Token Endpoint
async function handleOAuthToken(body: any) {
  console.log("Handling OAuth token exchange:", body);

  const { grant_type, code, redirect_uri, client_id, client_secret } = body;

  if (grant_type !== "authorization_code") {
    throw new Error("Unsupported grant_type");
  }

  const authCode = AUTH_CODES.get(code);
  if (!authCode || authCode.expires_at < Date.now()) {
    throw new Error("Invalid or expired authorization code");
  }

  const client = OAUTH_CLIENTS.get(client_id);
  if (!client || client.client_secret !== client_secret) {
    throw new Error("Invalid client credentials");
  }

  if (authCode.redirect_uri !== redirect_uri) {
    throw new Error("Invalid redirect_uri");
  }

  // 認証コードを削除（一度だけ使用可能）
  AUTH_CODES.delete(code);

  // アクセストークンを生成
  const access_token = crypto.randomBytes(32).toString("hex");
  const refresh_token = crypto.randomBytes(32).toString("hex");

  ACCESS_TOKENS.set(access_token, {
    token: access_token,
    client_id,
    user_id: authCode.user_id,
    scope: ["read", "write"],
    expires_at: Date.now() + 3600000, // 1時間
  });

  console.log("Access token generated for client:", client_id);

  return {
    access_token,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token,
    scope: "read write",
  };
}

// 初期化ハンドラー
async function handleInitialize(params: any) {
  console.log("Handling initialize with params:", params);

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
        flows: ["authorization_code"],
        scopes: ["read", "write", "claudeai"],
        authorizationUrl: `${
          process.env.NEXTAUTH_URL || "https://biz-clone.vercel.app"
        }/api/oauth/authorize`,
        tokenUrl: `${
          process.env.NEXTAUTH_URL || "https://biz-clone.vercel.app"
        }/api/oauth/token`,
        registrationUrl: `${
          process.env.NEXTAUTH_URL || "https://biz-clone.vercel.app"
        }/api/oauth/register`,
      },
    },
    serverInfo: {
      name: "biz-clone-mcp-server",
      version: "1.0.0",
      description: "biz-clone会計システムのMCPサーバー",
      author: "biz-clone team",
      homepage: process.env.NEXTAUTH_URL || "https://biz-clone.vercel.app",
    },
    implementation: {
      name: "biz-clone-mcp-server",
      version: "1.0.0",
      features: ["oauth2", "dynamic_client_registration"],
      documentation: `${
        process.env.NEXTAUTH_URL || "https://biz-clone.vercel.app"
      }/api/docs`,
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
      annotations: {
        audience: ["user"],
        level: "beginner",
      },
    })),
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

// プロンプト一覧ハンドラー
async function handleListPrompts() {
  console.log("Handling list_prompts");
  const result = {
    prompts: [
      {
        name: "create_journal_entry",
        description: "新しい仕訳を作成するためのガイド付きプロンプト",
        arguments: [
          {
            name: "date",
            description: "仕訳日（YYYY-MM-DD形式）",
            required: true,
          },
          {
            name: "description",
            description: "取引の説明",
            required: false,
          },
        ],
      },
      {
        name: "search_transactions",
        description: "取引を検索するためのプロンプト",
        arguments: [
          {
            name: "period",
            description: "検索期間（例：今月、先月、今年）",
            required: false,
          },
          {
            name: "keywords",
            description: "検索キーワード",
            required: false,
          },
        ],
      },
    ],
  };
  console.log("Returning prompts");
  return result;
}

// MCP通知ハンドラー（Claude Web版互換性）
async function handleNotificationInitialized() {
  console.log("Handling notifications/initialized");

  // Claude Web版が初期化完了を通知してきた場合の処理
  // 通常は何も返さない（通知は一方向）
  console.log("Claude Web client has completed initialization");

  return {}; // 空のオブジェクトを返す
}

// アクセストークンの検証
function validateAccessToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const tokenData = ACCESS_TOKENS.get(token);

  if (!tokenData || tokenData.expires_at < Date.now()) {
    return null;
  }

  return tokenData.user_id;
}

// ツール実行ハンドラー
async function handleCallTool(params: any, request: NextRequest) {
  console.log("Handling call_tool with params:", params);

  const { name, arguments: args } = params;

  if (!name || !MCP_TOOLS.find((tool) => tool.name === name)) {
    throw new Error(`Tool not found: ${name}`);
  }

  // 認証チェック
  const authHeader = request.headers.get("Authorization");
  const userId = validateAccessToken(authHeader);

  if (!userId) {
    throw new Error("Authentication required");
  }

  console.log(`Authenticated user ${userId} calling tool: ${name}`);

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

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  console.log(`Calling API: ${method} ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(args) : undefined,
    });

    const responseText = await response.text();
    console.log(`API response status: ${response.status}`);
    console.log(`API response: ${responseText.substring(0, 500)}...`);

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${responseText}`);
    }

    const result = responseText ? JSON.parse(responseText) : {};
    console.log("Tool execution successful");
    return result;
  } catch (error) {
    console.error("Tool execution error:", error);
    throw error;
  }
}

// メインハンドラー
export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url);

  console.log(`GET request to: ${pathname}`);
  console.log("Query params:", Object.fromEntries(searchParams.entries()));

  // Claude Web版のSSE接続要求をチェック
  const acceptHeader = request.headers.get("accept") || "";
  console.log("Accept header:", acceptHeader);

  try {
    // OAuth 2.0 Well-Known Configuration
    if (pathname === "/api/.well-known/oauth-authorization-server") {
      const config = await handleWellKnownOAuth();
      return NextResponse.json(config, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // OAuth 2.0 Authorization Endpoint
    if (pathname === "/api/oauth/authorize") {
      const redirectUrl = await handleOAuthAuthorize(searchParams);
      return NextResponse.redirect(redirectUrl);
    }

    // Claude Web版のSSE接続要求に対応
    if (pathname === "/api" && acceptHeader.includes("text/event-stream")) {
      console.log("🌊 SSE connection requested by Claude Web");

      // SSE接続の確立
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          // SSE初期化メッセージ
          const initMessage = {
            type: "mcp_init",
            data: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: { listChanged: true },
                resources: { subscribe: false, listChanged: false },
                prompts: { listChanged: false },
                logging: {},
                auth: {
                  oauth: true,
                  flows: ["authorization_code"],
                  scopes: ["read", "write", "claudeai"],
                  authorizationUrl:
                    "https://biz-clone.vercel.app/api/oauth/authorize",
                  tokenUrl: "https://biz-clone.vercel.app/api/oauth/token",
                  registrationUrl:
                    "https://biz-clone.vercel.app/api/oauth/register",
                },
              },
              serverInfo: {
                name: "biz-clone-mcp-server",
                version: "1.0.0",
                description: "biz-clone会計システムのMCPサーバー",
                author: "biz-clone team",
                homepage: "https://biz-clone.vercel.app",
              },
            },
          };

          // SSE形式でデータ送信
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initMessage)}\n\n`),
          );
          console.log("🚀 SSE init message sent");

          // ツール一覧の送信
          const toolsMessage = {
            type: "tools_list",
            data: {
              tools: MCP_TOOLS,
            },
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(toolsMessage)}\n\n`),
          );
          console.log("🔧 SSE tools list sent");

          // 定期的なハートビート（20秒間隔）
          const heartbeatInterval = setInterval(() => {
            try {
              const heartbeat = {
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`),
              );
              console.log("💓 SSE heartbeat sent");
            } catch (error) {
              console.log("❌ Heartbeat error, closing connection:", error);
              clearInterval(heartbeatInterval);
              controller.close();
            }
          }, 20000);

          // 接続終了時のクリーンアップ
          request.signal.addEventListener("abort", () => {
            console.log("🔌 SSE connection aborted");
            clearInterval(heartbeatInterval);
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        },
      });
    }

    // デフォルトレスポンス（MCP情報）
    const info = {
      status: "MCP endpoint is running",
      timestamp: new Date().toISOString(),
      availableMethods: [
        "initialize",
        "list_tools",
        "call_tool",
        "list_resources",
        "list_prompts",
      ],
      corsEnabled: true,
      endpoint: "/api",
      protocol: "JSON-RPC 2.0 + SSE",
      authentication: {
        supported: true,
        methods: ["OAuth 2.0"],
        wellKnown: "/.well-known/oauth-authorization-server",
      },
    };

    return NextResponse.json(info, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: any) {
    console.error("GET request error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);

  console.log(`POST request to: ${pathname}`);

  try {
    // OAuth 2.0 Client Registration
    if (pathname === "/api/oauth/register") {
      const body = await request.json();
      const result = await handleClientRegistration(body);
      return NextResponse.json(result, {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // OAuth 2.0 Token Exchange
    if (pathname === "/api/oauth/token") {
      const body = await request.json();
      const result = await handleOAuthToken(body);
      return NextResponse.json(result, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // JSON-RPC 2.0 処理
    const body = await request.json();
    console.log("Request body:", body);

    if (!body.jsonrpc || body.jsonrpc !== "2.0") {
      throw new Error("Invalid JSON-RPC version");
    }

    let result: any;

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

      case "list_prompts":
        result = await handleListPrompts();
        break;

      // MCP 通知メソッド（Claude Web版互換性）
      case "notifications/initialized":
        result = await handleNotificationInitialized();
        break;

      default:
        throw new Error(`Unknown method: ${body.method}`);
    }

    const response = {
      jsonrpc: "2.0",
      id: body.id,
      result,
    };

    console.log(
      "Response:",
      JSON.stringify(response).substring(0, 500) + "...",
    );

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("POST request error:", error);
    console.error("Error stack:", error.stack);

    const errorResponse = {
      jsonrpc: "2.0",
      id: request.body ? (await request.json().catch(() => ({})))?.id : null,
      error: {
        code: -32603,
        message: error.message || "Internal error",
        data: {
          timestamp: new Date().toISOString(),
          path: pathname,
        },
      },
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  console.log("OPTIONS request received");

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With, Accept, Cache-Control",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
