/**
 * Analysis Codes Master API Routes
 * ============================================================================
 * 分析コードマスタのCRUD操作API
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
  createAnalysisCodeSchema, 
  updateAnalysisCodeSchema,
  type CreateAnalysisCodeInput,
  type UpdateAnalysisCodeInput
} from '@/lib/schemas/master';
import { AnalysisCodeService } from '@/lib/database/master-data';

// ====================
// GET /api/master/analysis-codes - 分析コード検索・一覧取得
// ====================

const analysisCodeSearchSchema = searchSchema.extend({
  analysisType: z.string().optional(),
  isActive: z.boolean().optional().default(true)
});

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      querySchema: analysisCodeSearchSchema
    },
    async (params) => {
      return await AnalysisCodeService.search(
        {
          searchTerm: params.searchTerm,
          isActive: params.isActive,
          analysisType: params.analysisType
        },
        {
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy || 'sortOrder',
          sortOrder: params.sortOrder
        }
      );
    }
  );
}

// ====================
// POST /api/master/analysis-codes - 新規分析コード作成
// ====================

export async function POST(request: NextRequest) {
  return handlePostRequest(
    request,
    {
      bodySchema: createAnalysisCodeSchema
    },
    async (data: CreateAnalysisCodeInput) => {
      const analysisCode = await AnalysisCodeService.create({
        analysisCode: data.analysisCode,
        analysisName: data.analysisName,
        analysisType: data.analysisType,
        sortOrder: data.sortOrder || undefined
      });

      return {
        analysisCode,
        message: `分析コード「${data.analysisCode}」を作成しました`
      };
    }
  );
}

// ====================
// PUT /api/master/analysis-codes?analysisCode=xxx - 既存分析コード更新
// ====================

const updateAnalysisCodeQuerySchema = z.object({
  analysisCode: z.string().min(1, "分析コードは必須です")
});

export async function PUT(request: NextRequest) {
  return handlePutRequest(
    request,
    {
      bodySchema: updateAnalysisCodeSchema,
      querySchema: updateAnalysisCodeQuerySchema
    },
    async (data: UpdateAnalysisCodeInput, params) => {
      const analysisCode = await AnalysisCodeService.update(params.analysisCode, {
        analysisName: data.analysisName,
        analysisType: data.analysisType,
        sortOrder: data.sortOrder || undefined
      });

      return {
        analysisCode,
        message: `分析コード「${params.analysisCode}」を更新しました`
      };
    }
  );
}

// ====================
// DELETE /api/master/analysis-codes?analysisCode=xxx - 分析コード削除
// ====================

export async function DELETE(request: NextRequest) {
  return handleDeleteRequest(
    request,
    {
      querySchema: updateAnalysisCodeQuerySchema
    },
    async (params) => {
      await AnalysisCodeService.delete(params.analysisCode);
      
      return {
        message: `分析コード「${params.analysisCode}」を削除しました`
      };
    }
  );
}