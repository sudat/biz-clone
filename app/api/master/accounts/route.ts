/**
 * Accounts Master API Routes
 * ============================================================================
 * 勘定科目マスタのCRUD操作API
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { 
  handleGetRequest, 
  handlePostRequest, 
  handlePutRequest, 
  handleDeleteRequest,
  searchSchema,
  codeParamSchema
} from '@/lib/api/validation';
import { 
  createAccountSchema, 
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput
} from '@/lib/schemas/master';
import { AccountService } from '@/lib/database/master-data';

// ====================
// GET /api/master/accounts - 勘定科目検索・一覧取得
// ====================

const accountSearchSchema = searchSchema.extend({
  accountType: z.enum(['資産', '負債', '純資産', '収益', '費用']).optional(),
  isActive: z.boolean().optional().default(true)
});

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      querySchema: accountSearchSchema
    },
    async (params) => {
      return await AccountService.search(
        {
          searchTerm: params.searchTerm,
          isActive: params.isActive,
          accountType: params.accountType
        },
        {
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy || 'accountCode',
          sortOrder: params.sortOrder
        }
      );
    }
  );
}

// ====================
// POST /api/master/accounts - 新規勘定科目作成
// ====================

export async function POST(request: NextRequest) {
  return handlePostRequest(
    request,
    {
      bodySchema: createAccountSchema
    },
    async (data: CreateAccountInput) => {
      const account = await AccountService.create({
        accountCode: data.accountCode,
        accountName: data.accountName,
        accountType: data.accountType,
        sortOrder: data.sortOrder || undefined,
        defaultTaxCode: data.defaultTaxCode || undefined
      });

      return {
        account,
        message: `勘定科目「${data.accountCode}」を作成しました`
      };
    }
  );
}

// ====================
// PUT /api/master/accounts?accountCode=xxx - 既存勘定科目更新
// ====================

const updateAccountQuerySchema = z.object({
  accountCode: z.string().min(1, "勘定科目コードは必須です")
});

export async function PUT(request: NextRequest) {
  return handlePutRequest(
    request,
    {
      bodySchema: updateAccountSchema,
      querySchema: updateAccountQuerySchema
    },
    async (data: UpdateAccountInput, params) => {
      const account = await AccountService.update(params.accountCode, {
        accountName: data.accountName,
        accountType: data.accountType,
        sortOrder: data.sortOrder || undefined,
        defaultTaxCode: data.defaultTaxCode || undefined
      });

      return {
        account,
        message: `勘定科目「${params.accountCode}」を更新しました`
      };
    }
  );
}

// ====================
// DELETE /api/master/accounts?accountCode=xxx - 勘定科目削除
// ====================

export async function DELETE(request: NextRequest) {
  return handleDeleteRequest(
    request,
    {
      querySchema: updateAccountQuerySchema
    },
    async (params) => {
      await AccountService.delete(params.accountCode);
      
      return {
        message: `勘定科目「${params.accountCode}」を削除しました`
      };
    }
  );
}