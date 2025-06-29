/**
 * Journal API Routes
 * ============================================================================
 * 仕訳データのCRUD操作API
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { 
  handleGetRequest, 
  handlePostRequest, 
  handlePutRequest, 
  handleDeleteRequest,
  searchSchema
} from '@/lib/api/validation';
import { journalSaveSchema } from '@/lib/api/types';
import { 
  saveJournal, 
  updateJournal, 
  deleteJournal, 
  searchJournals
} from '@/lib/database/journal-mcp';

// ====================
// GET /api/journal - 仕訳検索
// ====================

const journalSearchSchema = searchSchema.extend({
  journalNumber: z.string().optional(),
  accountCode: z.string().optional(),
  partnerCode: z.string().optional(),
  departmentCode: z.string().optional(),
  analysisCode: z.string().optional(),
  fromDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "有効な開始日を入力してください"
  }).optional(),
  toDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "有効な終了日を入力してください"
  }).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  status: z.enum(['draft', 'approved', 'all']).optional().default('all')
});

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      querySchema: journalSearchSchema
    },
    async (params, _auth) => {
      return await searchJournals({
        searchTerm: params.searchTerm,
        filters: {
          journalNumber: params.journalNumber,
          accountCode: params.accountCode,
          partnerCode: params.partnerCode,
          departmentCode: params.departmentCode,
          analysisCode: params.analysisCode,
          fromDate: params.fromDate,
          toDate: params.toDate,
          minAmount: params.minAmount,
          maxAmount: params.maxAmount,
          status: params.status
        },
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy || 'journalDate',
        sortOrder: params.sortOrder
      });
    }
  );
}

// ====================
// POST /api/journal - 新規仕訳作成
// ====================

export async function POST(request: NextRequest) {
  return handlePostRequest(
    request,
    {
      bodySchema: journalSaveSchema
    },
    async (data, _auth) => {
      return await saveJournal(data);
    }
  );
}

// ====================
// PUT /api/journal?journalNumber=xxx - 既存仕訳更新
// ====================

const updateJournalQuerySchema = z.object({
  journalNumber: z.string().min(1, "仕訳番号は必須です")
});

export async function PUT(request: NextRequest) {
  return handlePutRequest(
    request,
    {
      bodySchema: journalSaveSchema,
      querySchema: updateJournalQuerySchema
    },
    async (data, params, _auth) => {
      return await updateJournal(params.journalNumber, data);
    }
  );
}

// ====================
// DELETE /api/journal?journalNumber=xxx - 仕訳削除
// ====================

export async function DELETE(request: NextRequest) {
  return handleDeleteRequest(
    request,
    {
      querySchema: updateJournalQuerySchema
    },
    async (params, _auth) => {
      await deleteJournal(params.journalNumber);
      return { message: `仕訳 ${params.journalNumber} を削除しました` };
    }
  );
}