/**
 * MCP Test Endpoint
 * ============================================================================
 * MCPプロトコルの動作確認用テストエンドポイント
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

// JSON-RPC request type
interface JsonRpcRequest {
  jsonrpc?: string;
  method?: string;
  params?: any;
  id?: string | number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as JsonRpcRequest;

    const testResponse = {
      jsonrpc: "2.0",
      method: body.method || "test",
      params: body.params || {},
      timestamp: new Date().toISOString(),
      status: "MCP connection successful",
      server: "biz-clone-accounting",
      version: "1.0.0",
      capabilities: {
        tools: {},
      },
      testData: {
        requestReceived: true,
        parsedBody: body,
        environment: process.env.NODE_ENV,
      },
    };

    return NextResponse.json(testResponse);
  } catch (error) {
    console.error("MCP Test Error:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
      id: null,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    protocol: "MCP 2024-11-30",
    server: "biz-clone-accounting",
    version: "1.0.0",
    description: "MCP Test endpoint for connection validation",
    timestamp: new Date().toISOString(),
    testInstructions: {
      method: "POST",
      contentType: "application/json",
      samplePayload: {
        jsonrpc: "2.0",
        method: "test",
        params: { test: true },
        id: 1,
      },
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
