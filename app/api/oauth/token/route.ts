import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  type AccessToken,
  oauthStorage,
  type RefreshToken,
} from "@/lib/oauth/storage";

export async function POST(request: NextRequest) {
  try {
    console.log("[OAuth Token] POST request received");

    const body = await request.json() as {
      grant_type?: string;
      code?: string;
      redirect_uri?: string;
      client_id?: string;
      client_secret?: string;
      refresh_token?: string;
    };
    console.log("[OAuth Token] Request body:", JSON.stringify(body, null, 2));

    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      refresh_token,
    } = body;

    // grant_typeの検証
    if (!grant_type) {
      return NextResponse.json({
        error: "invalid_request",
        error_description: "grant_type is required",
      }, { status: 400 });
    }

    if (grant_type === "authorization_code") {
      return handleAuthorizationCodeGrant({
        code: code || "",
        redirect_uri: redirect_uri || "",
        client_id: client_id || "",
        client_secret: client_secret || "",
      });
    } else if (grant_type === "refresh_token") {
      return handleRefreshTokenGrant({
        refresh_token: refresh_token || "",
        client_id: client_id || "",
        client_secret: client_secret || "",
      });
    } else {
      return NextResponse.json({
        error: "unsupported_grant_type",
        error_description: `Grant type '${grant_type}' is not supported`,
      }, { status: 400 });
    }
  } catch (error) {
    console.error("[OAuth Token] Error:", error);
    return NextResponse.json({
      error: "server_error",
      error_description: "Internal server error during token exchange",
    }, { status: 500 });
  }
}

async function handleAuthorizationCodeGrant({
  code,
  redirect_uri,
  client_id,
  client_secret,
}: {
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
}) {
  console.log("[OAuth Token] Processing authorization_code grant");

  // 必須パラメータの検証
  if (!code || !redirect_uri || !client_id) {
    return NextResponse.json({
      error: "invalid_request",
      error_description: "code, redirect_uri, and client_id are required",
    }, { status: 400 });
  }

  // 認証コードの検証
  const authCode = oauthStorage.getAuthCode(code);
  if (!authCode) {
    return NextResponse.json({
      error: "invalid_grant",
      error_description: "Authorization code is invalid or expired",
    }, { status: 400 });
  }

  // クライアントIDとリダイレクトURIの検証
  if (
    authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri
  ) {
    return NextResponse.json({
      error: "invalid_grant",
      error_description: "Authorization code is invalid",
    }, { status: 400 });
  }

  // 認証コードを削除（一回限り使用）
  oauthStorage.deleteAuthCode(code);

  // アクセストークンとリフレッシュトークンの生成
  const accessToken = `mcp_access_${crypto.randomBytes(32).toString("hex")}`;
  const refreshToken = `mcp_refresh_${crypto.randomBytes(32).toString("hex")}`;
  const expiresIn = 3600; // 1時間

  // トークンの保存
  const accessTokenData: AccessToken = {
    token: accessToken,
    client_id,
    user_id: authCode.user_id,
    scope: authCode.scope,
    expires_at: Date.now() + expiresIn * 1000,
    token_type: "Bearer",
  };

  const refreshTokenData: RefreshToken = {
    token: refreshToken,
    client_id,
    user_id: authCode.user_id,
    scope: authCode.scope,
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30日
  };

  oauthStorage.saveAccessToken(accessTokenData);
  oauthStorage.saveRefreshToken(refreshTokenData);

  console.log("[OAuth Token] Tokens generated:", {
    access_token: accessToken.substring(0, 20) + "...",
    client_id,
    user_id: authCode.user_id,
  });

  // OAuth 2.0準拠のトークンレスポンス
  const response = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    refresh_token: refreshToken,
    scope: authCode.scope.join(" "),
  };

  return NextResponse.json(response, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
    },
  });
}

async function handleRefreshTokenGrant({
  refresh_token,
  client_id,
  client_secret,
}: {
  refresh_token: string;
  client_id: string;
  client_secret: string;
}) {
  console.log("[OAuth Token] Processing refresh_token grant");

  if (!refresh_token || !client_id) {
    return NextResponse.json({
      error: "invalid_request",
      error_description: "refresh_token and client_id are required",
    }, { status: 400 });
  }

  const storedRefreshToken = oauthStorage.getRefreshToken(refresh_token);
  if (!storedRefreshToken) {
    return NextResponse.json({
      error: "invalid_grant",
      error_description: "Refresh token is invalid or expired",
    }, { status: 400 });
  }

  if (storedRefreshToken.client_id !== client_id) {
    return NextResponse.json({
      error: "invalid_grant",
      error_description: "Refresh token does not belong to this client",
    }, { status: 400 });
  }

  // 新しいアクセストークンの生成
  const newAccessToken = `mcp_access_${crypto.randomBytes(32).toString("hex")}`;
  const expiresIn = 3600;

  const accessTokenData: AccessToken = {
    token: newAccessToken,
    client_id,
    user_id: storedRefreshToken.user_id,
    scope: storedRefreshToken.scope,
    expires_at: Date.now() + expiresIn * 1000,
    token_type: "Bearer",
  };

  oauthStorage.saveAccessToken(accessTokenData);

  console.log("[OAuth Token] New access token generated via refresh");

  return NextResponse.json({
    access_token: newAccessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    scope: storedRefreshToken.scope.join(" "),
  }, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
    },
  });
}

// デバッグ用：発行済みトークン一覧
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug");

  if (debug === "true") {
    return NextResponse.json({
      storage_stats: oauthStorage.getStats(),
    });
  }

  return NextResponse.json({
    error: "invalid_request",
    error_description:
      "This endpoint only supports POST requests for token exchange",
  }, { status: 405 });
}
