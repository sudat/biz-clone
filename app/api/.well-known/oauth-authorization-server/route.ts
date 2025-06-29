import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("[OAuth Well-Known] GET request received");

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://biz-clone.vercel.app";

    // RFC8414 OAuth 2.0 Authorization Server Metadata
    const metadata = {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
      token_endpoint: `${baseUrl}/api/oauth/token`,
      registration_endpoint: `${baseUrl}/api/oauth/register`,
      jwks_uri: `${baseUrl}/api/oauth/jwks`,

      // サポートするレスポンスタイプ
      response_types_supported: ["code"],

      // サポートするグラントタイプ
      grant_types_supported: [
        "authorization_code",
        "refresh_token",
      ],

      // サポートするトークンエンドポイント認証方法
      token_endpoint_auth_methods_supported: [
        "client_secret_post",
        "client_secret_basic",
        "none",
      ],

      // サポートするスコープ
      scopes_supported: [
        "read",
        "write",
      ],

      // サポートするレスポンスモード
      response_modes_supported: [
        "query",
        "fragment",
      ],

      // サポートするSubject Identifier Types
      subject_types_supported: ["public"],

      // サポートするID Token署名アルゴリズム
      id_token_signing_alg_values_supported: ["RS256"],

      // サポートするクレーム
      claims_supported: [
        "sub",
        "iss",
        "aud",
        "exp",
        "iat",
        "auth_time",
      ],

      // Dynamic Client Registration サポート
      // registration_endpoint は上で定義済み

      // PKCE サポート
      code_challenge_methods_supported: [
        "S256",
        "plain",
      ],

      // その他のメタデータ
      service_documentation: `${baseUrl}/api/docs/oauth`,
      ui_locales_supported: ["en", "ja"],

      // MCP固有の設定
      mcp_capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        logging: true,
      },

      // Claude Web版互換性
      claude_web_compatible: true,
      protocol_version: "2025-03-26",
    };

    console.log("[OAuth Well-Known] Metadata generated:", {
      issuer: metadata.issuer,
      endpoints: {
        authorization: metadata.authorization_endpoint,
        token: metadata.token_endpoint,
        registration: metadata.registration_endpoint,
      },
    });

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("[OAuth Well-Known] Error:", error);
    return NextResponse.json({
      error: "server_error",
      error_description: "Internal server error while generating metadata",
    }, { status: 500 });
  }
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
