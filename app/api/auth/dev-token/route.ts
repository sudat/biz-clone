/**
 * Development Token API
 * ============================================================================
 * 開発用トークン生成エンドポイント
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handlePostRequest, handleGetRequest } from '@/lib/api/validation';
import { generateDevToken } from '@/lib/api/auth';

// ====================
// 開発用トークン生成スキーマ
// ====================

const devTokenSchema = z.object({
  clientId: z.string().optional().default('dev-client'),
  scopes: z.array(z.string()).optional().default(['mcp:read', 'mcp:write'])
});

// ====================
// POST /api/auth/dev-token - 開発用トークン生成
// ====================

export async function POST(request: NextRequest) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not available in production', { status: 404 });
  }

  return handlePostRequest(
    request,
    {
      bodySchema: devTokenSchema,
      allowPublic: true
    },
    async (data, _auth) => {
      return await generateDevToken(data.clientId);
    }
  );
}

// ====================
// GET /api/auth/dev-token - 簡易トークン生成
// ====================

export async function GET(request: NextRequest) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not available in production', { status: 404 });
  }

  return handleGetRequest(
    request,
    {
      allowPublic: true
    },
    async (_params, _auth) => {
      return await generateDevToken('dev-client');
    }
  );
}