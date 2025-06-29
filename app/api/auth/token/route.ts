/**
 * Authentication Token API
 * ============================================================================
 * OAuth 2.1 トークン交換エンドポイント
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handlePostRequest } from '@/lib/api/validation';
import { generateAccessToken } from '@/lib/api/auth';

// ====================
// トークン交換スキーマ
// ====================

const tokenExchangeSchema = z.object({
  grant_type: z.enum(['authorization_code', 'client_credentials'], {
    errorMap: () => ({ message: "サポートされていないgrant_typeです" })
  }),
  code: z.string().optional(),
  client_id: z.string().min(1, "client_idは必須です"),
  client_secret: z.string().optional(),
  code_verifier: z.string().optional(),
  scope: z.string().optional().default('mcp:read mcp:write')
});

// ====================
// POST /api/auth/token - トークン交換
// ====================

export async function POST(request: NextRequest) {
  return handlePostRequest(
    request,
    {
      bodySchema: tokenExchangeSchema,
      allowPublic: true
    },
    async (data, _auth) => {
      const scopes = (data.scope || '').split(' ').filter(Boolean);
      
      if (data.grant_type === 'client_credentials') {
        // クライアント資格情報フロー（開発用）
        const userId = `client-${data.client_id}`;
        const accessToken = await generateAccessToken(userId, scopes);
        
        return {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 86400, // 24時間
          scope: data.scope
        };
      }
      
      if (data.grant_type === 'authorization_code') {
        // 認可コードフロー（実装予定）
        // 現在は簡易実装
        const userId = `auth-user-${Date.now()}`;
        const accessToken = await generateAccessToken(userId, scopes);
        
        return {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 86400,
          scope: data.scope
        };
      }
      
      throw new Error('Unsupported grant type');
    }
  );
}