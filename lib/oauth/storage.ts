// OAuth 2.0 データ管理ライブラリ
// 各エンドポイント間でクライアント、認証コード、トークンを共有

export interface OAuthClient {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  client_name: string;
  created_at: number;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
}

export interface AuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  expires_at: number;
  user_id: string;
  scope: string[];
  state?: string;
}

export interface AccessToken {
  token: string;
  client_id: string;
  user_id: string;
  scope: string[];
  expires_at: number;
  token_type: string;
}

export interface RefreshToken {
  token: string;
  client_id: string;
  user_id: string;
  scope: string[];
  expires_at: number;
}

// 一時的なメモリストレージ（本番環境では Redis や Database を使用）
class OAuthStorage {
  private clients = new Map<string, OAuthClient>();
  private authCodes = new Map<string, AuthCode>();
  private accessTokens = new Map<string, AccessToken>();
  private refreshTokens = new Map<string, RefreshToken>();

  // クライアント管理
  saveClient(client: OAuthClient): void {
    this.clients.set(client.client_id, client);
    console.log("[OAuth Storage] Client saved:", {
      client_id: client.client_id,
      client_name: client.client_name,
    });
  }

  getClient(client_id: string): OAuthClient | undefined {
    return this.clients.get(client_id);
  }

  getAllClients(): OAuthClient[] {
    return Array.from(this.clients.values());
  }

  // 認証コード管理
  saveAuthCode(authCode: AuthCode): void {
    this.authCodes.set(authCode.code, authCode);
    console.log("[OAuth Storage] Auth code saved:", {
      code: authCode.code.substring(0, 8) + "...",
      client_id: authCode.client_id,
      user_id: authCode.user_id,
    });
  }

  getAuthCode(code: string): AuthCode | undefined {
    const authCode = this.authCodes.get(code);
    if (authCode && Date.now() > authCode.expires_at) {
      // 期限切れのコードを削除
      this.authCodes.delete(code);
      console.log(
        "[OAuth Storage] Expired auth code removed:",
        code.substring(0, 8) + "...",
      );
      return undefined;
    }
    return authCode;
  }

  deleteAuthCode(code: string): void {
    this.authCodes.delete(code);
    console.log(
      "[OAuth Storage] Auth code deleted:",
      code.substring(0, 8) + "...",
    );
  }

  // アクセストークン管理
  saveAccessToken(token: AccessToken): void {
    this.accessTokens.set(token.token, token);
    console.log("[OAuth Storage] Access token saved:", {
      token: token.token.substring(0, 20) + "...",
      client_id: token.client_id,
      user_id: token.user_id,
      expires_at: new Date(token.expires_at).toISOString(),
    });
  }

  getAccessToken(token: string): AccessToken | undefined {
    const accessToken = this.accessTokens.get(token);
    if (accessToken && Date.now() > accessToken.expires_at) {
      // 期限切れのトークンを削除
      this.accessTokens.delete(token);
      console.log(
        "[OAuth Storage] Expired access token removed:",
        token.substring(0, 20) + "...",
      );
      return undefined;
    }
    return accessToken;
  }

  deleteAccessToken(token: string): void {
    this.accessTokens.delete(token);
    console.log(
      "[OAuth Storage] Access token deleted:",
      token.substring(0, 20) + "...",
    );
  }

  // リフレッシュトークン管理
  saveRefreshToken(token: RefreshToken): void {
    this.refreshTokens.set(token.token, token);
    console.log("[OAuth Storage] Refresh token saved:", {
      token: token.token.substring(0, 20) + "...",
      client_id: token.client_id,
      user_id: token.user_id,
    });
  }

  getRefreshToken(token: string): RefreshToken | undefined {
    const refreshToken = this.refreshTokens.get(token);
    if (refreshToken && Date.now() > refreshToken.expires_at) {
      // 期限切れのトークンを削除
      this.refreshTokens.delete(token);
      console.log(
        "[OAuth Storage] Expired refresh token removed:",
        token.substring(0, 20) + "...",
      );
      return undefined;
    }
    return refreshToken;
  }

  deleteRefreshToken(token: string): void {
    this.refreshTokens.delete(token);
    console.log(
      "[OAuth Storage] Refresh token deleted:",
      token.substring(0, 20) + "...",
    );
  }

  // デバッグ用メソッド
  getStats(): {
    clients: number;
    authCodes: number;
    accessTokens: number;
    refreshTokens: number;
  } {
    return {
      clients: this.clients.size,
      authCodes: this.authCodes.size,
      accessTokens: this.accessTokens.size,
      refreshTokens: this.refreshTokens.size,
    };
  }

  // クリーンアップ（期限切れのデータを削除）
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // 期限切れの認証コードを削除
    for (const [code, authCode] of this.authCodes.entries()) {
      if (now > authCode.expires_at) {
        this.authCodes.delete(code);
        cleaned++;
      }
    }

    // 期限切れのアクセストークンを削除
    for (const [token, accessToken] of this.accessTokens.entries()) {
      if (now > accessToken.expires_at) {
        this.accessTokens.delete(token);
        cleaned++;
      }
    }

    // 期限切れのリフレッシュトークンを削除
    for (const [token, refreshToken] of this.refreshTokens.entries()) {
      if (now > refreshToken.expires_at) {
        this.refreshTokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `[OAuth Storage] Cleanup completed: ${cleaned} expired items removed`,
      );
    }
  }
}

// シングルトンインスタンス
export const oauthStorage = new OAuthStorage();

// 定期的なクリーンアップ（5分ごと）
if (typeof global !== "undefined") {
  setInterval(() => {
    oauthStorage.cleanup();
  }, 5 * 60 * 1000);
}
