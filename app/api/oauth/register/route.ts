import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { type OAuthClient, oauthStorage } from "@/lib/oauth/storage";

export async function POST(request: NextRequest) {
  try {
    console.log("[OAuth Register] POST request received");

    const body = await request.json();
    console.log(
      "[OAuth Register] Request body:",
      JSON.stringify(body, null, 2),
    );

    // RFC7591 準拠のクライアント登録
    const {
      client_name,
      redirect_uris,
      grant_types = ["authorization_code"],
      response_types = ["code"],
      scope = "read write",
    } = body;

    // 必須パラメータの検証
    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
      console.log("[OAuth Register] Missing required parameters");
      return NextResponse.json({
        error: "invalid_request",
        error_description: "client_name and redirect_uris are required",
      }, { status: 400 });
    }

    // クライアント情報の生成
    const client_id = `mcp_${crypto.randomBytes(16).toString("hex")}`;
    const client_secret = crypto.randomBytes(32).toString("hex");

    // クライアント情報の保存
    const clientInfo: OAuthClient = {
      client_id,
      client_secret,
      redirect_uris,
      client_name,
      created_at: Date.now(),
      grant_types,
      response_types,
      scope,
    };

    oauthStorage.saveClient(clientInfo);

    console.log("[OAuth Register] Client registered:", {
      client_id,
      client_name,
      redirect_uris,
    });

    // RFC7591 準拠のレスポンス
    const response = {
      client_id,
      client_secret,
      client_name,
      redirect_uris,
      grant_types,
      response_types,
      scope,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // 無期限
    };

    console.log(
      "[OAuth Register] Response:",
      JSON.stringify(response, null, 2),
    );

    return NextResponse.json(response, {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("[OAuth Register] Error:", error);
    return NextResponse.json({
      error: "server_error",
      error_description: "Internal server error during client registration",
    }, { status: 500 });
  }
}

// クライアント情報の取得（デバッグ用）
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const client_id = url.searchParams.get("client_id");

    if (!client_id) {
      return NextResponse.json({
        error: "invalid_request",
        error_description: "client_id parameter required",
      }, { status: 400 });
    }

    const client = oauthStorage.getClient(client_id);
    if (!client) {
      return NextResponse.json({
        error: "invalid_client",
        error_description: "Client not found",
      }, { status: 404 });
    }

    // シークレットを除いた情報を返す
    const { client_secret, ...publicInfo } = client;
    return NextResponse.json(publicInfo);
  } catch (error) {
    console.error("[OAuth Register GET] Error:", error);
    return NextResponse.json({
      error: "server_error",
      error_description: "Internal server error",
    }, { status: 500 });
  }
}

// デバッグ用：登録済みクライアント一覧
// PUT メソッド - Claude Code互換性のため（POSTと同じ処理）
export async function PUT(request: NextRequest) {
  console.log(
    "[OAuth Register] PUT request received (Claude Code compatibility)",
  );
  // PUTメソッドをPOSTメソッドと同じ処理にリダイレクト
  return POST(request);
}

export async function OPTIONS() {
  return NextResponse.json({
    registered_clients: oauthStorage.getAllClients().map((client) => ({
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      created_at: client.created_at,
    })),
    storage_stats: oauthStorage.getStats(),
  });
}
