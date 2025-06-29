/**
 * MCP Connection Test Endpoint
 * ============================================================================
 * MCP接続のテスト用エンドポイント
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // テスト用のJSON-RPCレスポンス
    const testResponse = {
      jsonrpc: "2.0",
      method: body.method || "test",
      params: body.params || {},
      timestamp: new Date().toISOString(),
      status: "MCP connection successful",
    };

    return NextResponse.json(testResponse, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/mcp/test",
    description: "MCP test endpoint is working",
    timestamp: new Date().toISOString(),
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
