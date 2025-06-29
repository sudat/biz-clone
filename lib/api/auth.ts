/**
 * Authentication Middleware for API Routes
 * ============================================================================
 * OAuth 2.1 Bearer Token認証システム
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { ApiException, ApiErrorType, AuthContext } from './types';
import { SignJWT, jwtVerify } from 'jose';

// ====================
// 設定とキー管理
// ====================

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'default-secret-key-for-development'
);

const JWT_ISSUER = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const JWT_EXPIRATION = '24h'; // トークンの有効期限

// 開発用の固定スコープ
const AVAILABLE_SCOPES = [
  'mcp:read',      // 読み取り専用
  'mcp:write',     // 書き込み権限
  'mcp:admin'      // 管理者権限
];

// ====================
// トークン生成・検証
// ====================

/**
 * アクセストークンを生成
 */
export async function generateAccessToken(
  userId: string,
  scopes: string[] = ['mcp:read', 'mcp:write']
): Promise<string> {
  const validScopes = scopes.filter(scope => AVAILABLE_SCOPES.includes(scope));
  
  const jwt = await new SignJWT({
    sub: userId,
    scopes: validScopes,
    type: 'access_token'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience('biz-clone-api')
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);

  return jwt;
}

/**
 * アクセストークンを検証
 */
export async function validateAccessToken(token: string): Promise<AuthContext> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: 'biz-clone-api',
    });

    if (payload.type !== 'access_token') {
      throw new ApiException(
        ApiErrorType.AUTHENTICATION,
        'Invalid token type',
        401
      );
    }

    return {
      authenticated: true,
      userId: payload.sub as string,
      scopes: payload.scopes as string[] || []
    };
  } catch (error) {
    throw new ApiException(
      ApiErrorType.AUTHENTICATION,
      'Invalid or expired access token',
      401,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Bearerトークン認証
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiException(
      ApiErrorType.AUTHENTICATION,
      'Bearer token is required',
      401
    );
  }

  const token = authHeader.substring(7);
  return await validateAccessToken(token);
}

/**
 * 必要なスコープをチェック
 */
export function requireScopes(requiredScopes: string[]) {
  return (auth: AuthContext): void => {
    if (!auth.authenticated) {
      throw new ApiException(
        ApiErrorType.AUTHENTICATION,
        'Authentication required',
        401
      );
    }

    const hasRequiredScope = requiredScopes.some(scope => 
      auth.scopes?.includes(scope) || auth.scopes?.includes('mcp:admin')
    );

    if (!hasRequiredScope) {
      throw new ApiException(
        ApiErrorType.AUTHORIZATION,
        `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        403,
        { 
          requiredScopes,
          userScopes: auth.scopes 
        }
      );
    }
  };
}

// ====================
// 開発用認証ヘルパー
// ====================

/**
 * 開発用のトークン生成
 */
export async function generateDevToken(clientId: string = 'dev-client'): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  scopes: string[];
}> {
  const userId = `dev-user-${Date.now()}`;
  const scopes = ['mcp:read', 'mcp:write'];
  
  const accessToken = await generateAccessToken(userId, scopes);
  
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400, // 24時間
    scopes
  };
}

/**
 * 認証不要モード（開発用）
 */
export function createMockAuth(): AuthContext {
  return {
    authenticated: true,
    userId: 'dev-user',
    scopes: ['mcp:read', 'mcp:write', 'mcp:admin']
  };
}

// ====================
// 認証ヘルパー関数
// ====================

/**
 * 認証が必要ないエンドポイントかチェック
 */
export function isPublicEndpoint(pathname: string): boolean {
  const publicPaths = [
    '/api/health',
    '/api/auth/token',
    '/api/auth/dev-token',
    '/api/auth/metadata'
  ];
  
  return publicPaths.some(path => pathname.startsWith(path));
}

/**
 * スコープから権限レベルを取得
 */
export function getPermissionLevel(scopes: string[]): 'read' | 'write' | 'admin' {
  if (scopes.includes('mcp:admin')) return 'admin';
  if (scopes.includes('mcp:write')) return 'write';
  return 'read';
}