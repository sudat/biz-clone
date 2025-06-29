/**
 * Partners Master API Routes
 * ============================================================================
 * 取引先マスタのCRUD操作API
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
import { 
  createPartnerSchema, 
  updatePartnerSchema,
  type CreatePartnerInput,
  type UpdatePartnerInput
} from '@/lib/schemas/master';
import { PartnerService } from '@/lib/database/master-data';

// ====================
// GET /api/master/partners - 取引先検索・一覧取得
// ====================

const partnerSearchSchema = searchSchema.extend({
  partnerType: z.string().optional(),
  isActive: z.boolean().optional().default(true)
});

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      querySchema: partnerSearchSchema
    },
    async (params) => {
      return await PartnerService.search(
        {
          searchTerm: params.searchTerm,
          isActive: params.isActive,
          partnerType: params.partnerType
        },
        {
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy || 'partnerCode',
          sortOrder: params.sortOrder
        }
      );
    }
  );
}

// ====================
// POST /api/master/partners - 新規取引先作成
// ====================

export async function POST(request: NextRequest) {
  return handlePostRequest(
    request,
    {
      bodySchema: createPartnerSchema
    },
    async (data: CreatePartnerInput) => {
      const partner = await PartnerService.create({
        partnerCode: data.partnerCode,
        partnerName: data.partnerName,
        partnerKana: data.partnerKana,
        partnerType: data.partnerType,
        address: data.address,
        phone: data.phone,
        email: data.email
      });

      return {
        partner,
        message: `取引先「${data.partnerCode}」を作成しました`
      };
    }
  );
}

// ====================
// PUT /api/master/partners?partnerCode=xxx - 既存取引先更新
// ====================

const updatePartnerQuerySchema = z.object({
  partnerCode: z.string().min(1, "取引先コードは必須です")
});

export async function PUT(request: NextRequest) {
  return handlePutRequest(
    request,
    {
      bodySchema: updatePartnerSchema,
      querySchema: updatePartnerQuerySchema
    },
    async (data: UpdatePartnerInput, params) => {
      const partner = await PartnerService.update(params.partnerCode, {
        partnerName: data.partnerName,
        partnerKana: data.partnerKana,
        partnerType: data.partnerType,
        address: data.address,
        phone: data.phone,
        email: data.email
      });

      return {
        partner,
        message: `取引先「${params.partnerCode}」を更新しました`
      };
    }
  );
}

// ====================
// DELETE /api/master/partners?partnerCode=xxx - 取引先削除
// ====================

export async function DELETE(request: NextRequest) {
  return handleDeleteRequest(
    request,
    {
      querySchema: updatePartnerQuerySchema
    },
    async (params) => {
      await PartnerService.delete(params.partnerCode);
      
      return {
        message: `取引先「${params.partnerCode}」を削除しました`
      };
    }
  );
}