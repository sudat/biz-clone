/**
 * OAuth 2.1 Metadata Discovery API
 * ============================================================================
 * OAuth 2.1 メタデータディスカバリエンドポイント
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { handleGetRequest } from '@/lib/api/validation';

// ====================
// GET /api/auth/metadata - OAuth メタデータ
// ====================

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      allowPublic: true
    },
    async (_params, _auth) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      return {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/api/auth/authorize`,
        token_endpoint: `${baseUrl}/api/auth/token`,
        userinfo_endpoint: `${baseUrl}/api/auth/userinfo`,
        jwks_uri: `${baseUrl}/api/auth/jwks`,
        scopes_supported: [
          'mcp:read',
          'mcp:write', 
          'mcp:admin'
        ],
        response_types_supported: [
          'code'
        ],
        grant_types_supported: [
          'authorization_code',
          'client_credentials'
        ],
        code_challenge_methods_supported: [
          'S256'
        ],
        token_endpoint_auth_methods_supported: [
          'client_secret_basic',
          'client_secret_post',
          'none'
        ],
        subject_types_supported: [
          'public'
        ],
        id_token_signing_alg_values_supported: [
          'HS256'
        ],
        service_documentation: `${baseUrl}/docs/mcp-api`,
        ui_locales_supported: [
          'ja-JP',
          'en-US'
        ]
      };
    }
  );
}