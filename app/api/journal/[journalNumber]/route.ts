/**
 * Single Journal API Routes
 * ============================================================================
 * 単一仕訳データの取得・更新・削除API
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { 
  handleGetRequest, 
  handlePutRequest, 
  handleDeleteRequest
} from '@/lib/api/validation';
import { journalSaveSchema } from '@/lib/api/types';
import { 
  getJournalByNumber,
  updateJournal, 
  deleteJournal
} from '@/lib/database/journal-mcp';
import { createNotFoundError } from '@/lib/api/error-handler';

// ====================
// パラメータ型定義 (Next.js 15対応)
// ====================

interface RouteContext {
  params: Promise<{
    journalNumber: string;
  }>;
}

// ====================
// GET /api/journal/[journalNumber] - 単一仕訳取得
// ====================

export async function GET(
  request: NextRequest, 
  context: RouteContext
) {
  return handleGetRequest(
    request,
    {
      requiredScopes: ['mcp:read']
    },
    async (_, _auth) => {
      const params = await context.params;
      const journal = await getJournalByNumber(params.journalNumber);
      
      if (!journal) {
        throw createNotFoundError('仕訳', params.journalNumber);
      }
      
      return journal;
    }
  );
}

// ====================
// PUT /api/journal/[journalNumber] - 単一仕訳更新
// ====================

export async function PUT(
  request: NextRequest, 
  context: RouteContext
) {
  return handlePutRequest(
    request,
    {
      bodySchema: journalSaveSchema,
      requiredScopes: ['mcp:write']
    },
    async (data, _, auth) => {
      const params = await context.params;
      return await updateJournal(params.journalNumber, data);
    }
  );
}

// ====================
// DELETE /api/journal/[journalNumber] - 単一仕訳削除
// ====================

export async function DELETE(
  request: NextRequest, 
  context: RouteContext
) {
  return handleDeleteRequest(
    request,
    {
      requiredScopes: ['mcp:write']
    },
    async (_, _auth) => {
      const params = await context.params;
      await deleteJournal(params.journalNumber);
      return { message: `仕訳 ${params.journalNumber} を削除しました` };
    }
  );
}