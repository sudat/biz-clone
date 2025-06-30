import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { oauthStorage } from "@/lib/oauth/storage";

export async function POST(request: NextRequest) {
  try {
    console.log("[OAuth Register] Client registration request received");

    const body = await request.json() as any;
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
      application_type = "web",
      token_endpoint_auth_method = "client_secret_post",
      scope = "read write",
    } = body;

    console.log("[OAuth Register] Registration params:", {
      client_name,
      redirect_uris,
      grant_types,
      response_types,
      application_type,
      token_endpoint_auth_method,
      scope,
    });

    // 必須パラメータの検証
    if (
      !client_name || !redirect_uris || !Array.isArray(redirect_uris) ||
      redirect_uris.length === 0
    ) {
      console.log("[OAuth Register] Missing required parameters");
      return NextResponse.json({
        error: "invalid_client_metadata",
        error_description:
          "Missing required parameters: client_name, redirect_uris",
      }, { status: 400 });
    }

    // grant_typesの検証
    const supportedGrantTypes = ["authorization_code", "refresh_token"];
    const invalidGrantTypes = grant_types.filter((type: string) =>
      !supportedGrantTypes.includes(type)
    );
    if (invalidGrantTypes.length > 0) {
      console.log(
        "[OAuth Register] Unsupported grant types:",
        invalidGrantTypes,
      );
      return NextResponse.json({
        error: "invalid_client_metadata",
        error_description: `Unsupported grant_types: ${
          invalidGrantTypes.join(", ")
        }`,
      }, { status: 400 });
    }

    // response_typesの検証
    const supportedResponseTypes = ["code"];
    const invalidResponseTypes = response_types.filter((type: string) =>
      !supportedResponseTypes.includes(type)
    );
    if (invalidResponseTypes.length > 0) {
      console.log(
        "[OAuth Register] Unsupported response types:",
        invalidResponseTypes,
      );
      return NextResponse.json({
        error: "invalid_client_metadata",
        error_description: `Unsupported response_types: ${
          invalidResponseTypes.join(", ")
        }`,
      }, { status: 400 });
    }

    // クライアント認証情報の生成
    const client_id = crypto.randomBytes(16).toString("hex");
    const client_secret = crypto.randomBytes(32).toString("hex");
    const client_id_issued_at = Math.floor(Date.now() / 1000);
    const client_secret_expires_at = 0; // 無期限

    // クライアント情報の保存
    const clientData = {
      client_id,
      client_secret,
      client_name,
      redirect_uris,
      grant_types,
      response_types,
      application_type,
      token_endpoint_auth_method,
      scope: scope.split(" "),
      client_id_issued_at,
      client_secret_expires_at,
      created_at: Date.now(),
    };

    oauthStorage.saveClient(clientData);

    console.log("[OAuth Register] Client registered successfully:", {
      client_id,
      client_name,
      redirect_uris,
    });

    // RFC7591 準拠のレスポンス
    return NextResponse.json({
      client_id,
      client_secret,
      client_name,
      redirect_uris,
      grant_types,
      response_types,
      application_type,
      token_endpoint_auth_method,
      scope,
      client_id_issued_at,
      client_secret_expires_at,
    }, {
      status: 201,
      headers: {
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

// クライアント一覧取得（デバッグ用）
export async function GET() {
  return NextResponse.json({
    message: "OAuth2 Client Registration Endpoint",
    endpoint: "/api/oauth/register",
    method: "POST",
    documentation: "RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol",
    clients: oauthStorage.getAllClients(),
  });
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
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
