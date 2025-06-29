import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { type AuthCode, oauthStorage } from "@/lib/oauth/storage";

export async function GET(request: NextRequest) {
  try {
    console.log("[OAuth Authorize] GET request received");

    const url = new URL(request.url);
    const params = {
      response_type: url.searchParams.get("response_type"),
      client_id: url.searchParams.get("client_id"),
      redirect_uri: url.searchParams.get("redirect_uri"),
      scope: url.searchParams.get("scope") || "read write",
      state: url.searchParams.get("state") || undefined,
    };

    console.log("[OAuth Authorize] Request params:", params);

    // 必須パラメータの検証
    if (!params.response_type || !params.client_id || !params.redirect_uri) {
      console.log("[OAuth Authorize] Missing required parameters");
      return NextResponse.json({
        error: "invalid_request",
        error_description:
          "Missing required parameters: response_type, client_id, redirect_uri",
      }, { status: 400 });
    }

    // response_typeの検証
    if (params.response_type !== "code") {
      console.log(
        "[OAuth Authorize] Unsupported response_type:",
        params.response_type,
      );
      return NextResponse.json({
        error: "unsupported_response_type",
        error_description: "Only 'code' response_type is supported",
      }, { status: 400 });
    }

    // 簡易的な認証（本番環境では適切な認証フローが必要）
    // Claude Web版では自動的に認証されるものとして処理
    const authCode = crypto.randomBytes(32).toString("hex");
    const userId = "claude_web_user"; // Claude Web版の固定ユーザー

    // 認証コードの保存（5分間有効）
    const authCodeData: AuthCode = {
      code: authCode,
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
      expires_at: Date.now() + 5 * 60 * 1000, // 5分
      user_id: userId,
      scope: params.scope.split(" "),
      state: params.state,
    };

    oauthStorage.saveAuthCode(authCodeData);

    console.log("[OAuth Authorize] Authorization code generated:", {
      code: authCode,
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
    });

    // リダイレクトURIに認証コードを付けてリダイレクト
    const redirectUrl = new URL(params.redirect_uri);
    redirectUrl.searchParams.set("code", authCode);
    if (params.state) {
      redirectUrl.searchParams.set("state", params.state);
    }

    console.log("[OAuth Authorize] Redirecting to:", redirectUrl.toString());

    return NextResponse.redirect(redirectUrl.toString(), {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("[OAuth Authorize] Error:", error);
    return NextResponse.json({
      error: "server_error",
      error_description: "Internal server error during authorization",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[OAuth Authorize] POST request received");

    const body = await request.json();
    console.log(
      "[OAuth Authorize] Request body:",
      JSON.stringify(body, null, 2),
    );

    // POSTでの認証フロー（フォームベース認証）
    const {
      response_type,
      client_id,
      redirect_uri,
      scope = "read write",
      state,
      username,
      password,
    } = body;

    // 必須パラメータの検証
    if (!response_type || !client_id || !redirect_uri) {
      return NextResponse.json({
        error: "invalid_request",
        error_description: "Missing required parameters",
      }, { status: 400 });
    }

    // 簡易認証（Claude Web版では自動承認）
    const authCode = crypto.randomBytes(32).toString("hex");
    const userId = username || "claude_web_user";

    // 認証コードの保存
    const authCodeData: AuthCode = {
      code: authCode,
      client_id,
      redirect_uri,
      expires_at: Date.now() + 5 * 60 * 1000,
      user_id: userId,
      scope: scope.split(" "),
      state,
    };

    oauthStorage.saveAuthCode(authCodeData);

    console.log("[OAuth Authorize POST] Authorization code generated:", {
      code: authCode,
      client_id,
      redirect_uri,
    });

    // 認証コードをレスポンスで返す
    return NextResponse.json({
      code: authCode,
      state,
      redirect_uri,
    }, {
      headers: {
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("[OAuth Authorize POST] Error:", error);
    return NextResponse.json({
      error: "server_error",
      error_description: "Internal server error during authorization",
    }, { status: 500 });
  }
}

// デバッグ用：発行済み認証コード一覧
export async function OPTIONS() {
  return NextResponse.json({
    storage_stats: oauthStorage.getStats(),
  });
}
