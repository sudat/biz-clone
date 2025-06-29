/**
 * MCP Standard Protocol Endpoint
 * ============================================================================
 * Claude Code用の標準MCPプロトコルエンドポイント
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

// MCP Tool definitions
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
            journalDate: { type: "string", description: "計上日 (YYYY-MM-DD形式)" },
            description: { type: "string", description: "摘要" }
          },
          required: ["journalDate"]
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
              totalAmount: { type: "number" }
            },
            required: ["debitCredit", "accountCode", "baseAmount", "taxAmount", "totalAmount"]
          },
          minItems: 2
        }
      },
      required: ["header", "details"]
    }
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
        limit: { type: "number", default: 20 }
      }
    }
  },
  {
    name: "search_accounts",
    description: "勘定科目を検索します",
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: { type: "string" },
        accountType: { type: "string" },
        isActive: { type: "boolean", default: true }
      }
    }
  },
  {
    name: "search_partners", 
    description: "取引先を検索します",
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: { type: "string" },
        partnerType: { type: "string" },
        isActive: { type: "boolean", default: true }
      }
    }
  },
  {
    name: "get_trial_balance",
    description: "試算表を取得します",
    inputSchema: {
      type: "object", 
      properties: {
        fromDate: { type: "string", description: "開始日 (YYYY-MM-DD)" },
        toDate: { type: "string", description: "終了日 (YYYY-MM-DD)" }
      }
    }
  },
  {
    name: "unified_search",
    description: "全データを横断検索します",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "検索キーワード" },
        types: { 
          type: "array", 
          items: { type: "string" },
          description: "検索対象タイプ (journal, account, partner, etc.)"
        }
      },
      required: ["query"]
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, method, params, id } = body;

    // JSON-RPC validation
    if (jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request" },
        id
      });
    }

    switch (method) {
      case "initialize":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-30",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "biz-clone-accounting",
              version: "1.0.0"
            }
          },
          id
        });

      case "tools/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            tools: MCP_TOOLS
          },
          id
        });

      case "tools/call":
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        
        if (!toolName) {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: { code: -32602, message: "Invalid params: missing tool name" },
            id
          });
        }

        // Tool execution (anonymous access allowed for now)
        try {
          const result = await executeToolCall(toolName, toolArgs);
          
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            },
            id
          });
        } catch (error) {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: { 
              code: -32603, 
              message: "Tool execution failed",
              data: error instanceof Error ? error.message : "Unknown error"
            },
            id
          });
        }

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32601, message: "Method not found" },
          id
        });
    }

  } catch (error) {
    console.error("MCP Protocol Error:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { 
        code: -32603, 
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error"
      },
      id: null
    });
  }
}

// Tool execution handler
async function executeToolCall(toolName: string, args: any) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://biz-clone.vercel.app';
  
  try {
    switch (toolName) {
      case "save_journal":
        const saveResponse = await fetch(`${baseUrl}/api/journal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        return await saveResponse.json();

      case "search_journals":
        const journalParams = new URLSearchParams();
        if (args.searchTerm) journalParams.set('searchTerm', args.searchTerm);
        if (args.fromDate) journalParams.set('fromDate', args.fromDate);
        if (args.toDate) journalParams.set('toDate', args.toDate);
        if (args.page) journalParams.set('page', args.page.toString());
        if (args.limit) journalParams.set('limit', args.limit.toString());
        
        const journalResponse = await fetch(`${baseUrl}/api/journal?${journalParams}`);
        return await journalResponse.json();

      case "search_accounts":
        const accountParams = new URLSearchParams();
        if (args.searchTerm) accountParams.set('searchTerm', args.searchTerm);
        if (args.accountType) accountParams.set('accountType', args.accountType);
        if (args.isActive !== undefined) accountParams.set('isActive', args.isActive.toString());
        
        const accountResponse = await fetch(`${baseUrl}/api/master/accounts?${accountParams}`);
        return await accountResponse.json();

      case "search_partners":
        const partnerParams = new URLSearchParams();
        if (args.searchTerm) partnerParams.set('searchTerm', args.searchTerm);
        if (args.partnerType) partnerParams.set('partnerType', args.partnerType);
        if (args.isActive !== undefined) partnerParams.set('isActive', args.isActive.toString());
        
        const partnerResponse = await fetch(`${baseUrl}/api/master/partners?${partnerParams}`);
        return await partnerResponse.json();

      case "get_trial_balance":
        const trialParams = new URLSearchParams();
        if (args.fromDate) trialParams.set('fromDate', args.fromDate);
        if (args.toDate) trialParams.set('toDate', args.toDate);
        
        const trialResponse = await fetch(`${baseUrl}/api/reports/trial-balance?${trialParams}`);
        return await trialResponse.json();

      case "unified_search":
        const searchParams = new URLSearchParams();
        if (args.query) searchParams.set('query', args.query);
        if (args.types) searchParams.set('types', args.types.join(','));
        
        const searchResponse = await fetch(`${baseUrl}/api/search/unified?${searchParams}`);
        return await searchResponse.json();

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    protocol: "MCP 2024-11-30",
    server: "biz-clone-accounting",
    version: "1.0.0",
    description: "Biz Clone Accounting MCP Server for journal and master data management",
    capabilities: {
      auth: {
        oauth2: {
          authorization_endpoint: "https://biz-clone.vercel.app/api/oauth/authorize",
          token_endpoint: "https://biz-clone.vercel.app/api/oauth/token",
          registration_endpoint: "https://biz-clone.vercel.app/api/mcp",
          scopes_supported: ["mcp:read", "mcp:write"],
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "client_credentials"]
        },
        anonymous: true  // Allow anonymous access for testing
      }
    },
    endpoints: {
      tools: "/api/mcp/tools",
      test: "/api/mcp/test"
    },
    timestamp: new Date().toISOString()
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // OAuth Dynamic Client Registration (RFC 7591)
    // Claude Code uses PUT for DCR
    const clientRegistration = {
      client_id: `mcp_client_${Date.now()}`,
      client_secret: `secret_${Math.random().toString(36).substr(2, 32)}`,
      client_name: body.client_name || "Claude Code MCP Client",
      client_uri: body.client_uri || "https://claude.ai",
      redirect_uris: body.redirect_uris || ["https://claude.ai/oauth/callback"],
      grant_types: ["authorization_code", "client_credentials"],
      response_types: ["code"],
      scope: "mcp:read mcp:write",
      token_endpoint_auth_method: "client_secret_basic"
    };

    return NextResponse.json(clientRegistration, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error) {
    console.error("DCR Error:", error);
    return NextResponse.json({
      error: "invalid_client_metadata",
      error_description: "Failed to register client"
    }, { 
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS", 
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}