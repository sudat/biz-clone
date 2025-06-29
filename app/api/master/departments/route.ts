/**
 * Departments Master API Routes
 * ============================================================================
 * 部門マスタのCRUD操作API
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
  createDepartmentSchema, 
  updateDepartmentSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput
} from '@/lib/schemas/master';
import { DepartmentService } from '@/lib/database/master-data';

// ====================
// GET /api/master/departments - 部門検索・一覧取得
// ====================

const departmentSearchSchema = searchSchema.extend({
  isActive: z.boolean().optional().default(true)
});

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      querySchema: departmentSearchSchema
    },
    async (params) => {
      return await DepartmentService.search(
        {
          searchTerm: params.searchTerm,
          isActive: params.isActive
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
// POST /api/master/departments - 新規部門作成
// ====================

export async function POST(request: NextRequest) {
  return handlePostRequest(
    request,
    {
      bodySchema: createDepartmentSchema
    },
    async (data: CreateDepartmentInput) => {
      const department = await DepartmentService.create({
        departmentCode: data.departmentCode,
        departmentName: data.departmentName,
        sortOrder: data.sortOrder || undefined
      });

      return {
        department,
        message: `部門「${data.departmentCode}」を作成しました`
      };
    }
  );
}

// ====================
// PUT /api/master/departments?departmentCode=xxx - 既存部門更新
// ====================

const updateDepartmentQuerySchema = z.object({
  departmentCode: z.string().min(1, "部門コードは必須です")
});

export async function PUT(request: NextRequest) {
  return handlePutRequest(
    request,
    {
      bodySchema: updateDepartmentSchema,
      querySchema: updateDepartmentQuerySchema
    },
    async (data: UpdateDepartmentInput, params) => {
      const department = await DepartmentService.update(params.departmentCode, {
        departmentName: data.departmentName,
        sortOrder: data.sortOrder || undefined
      });

      return {
        department,
        message: `部門「${params.departmentCode}」を更新しました`
      };
    }
  );
}

// ====================
// DELETE /api/master/departments?departmentCode=xxx - 部門削除
// ====================

export async function DELETE(request: NextRequest) {
  return handleDeleteRequest(
    request,
    {
      querySchema: updateDepartmentQuerySchema
    },
    async (params) => {
      await DepartmentService.delete(params.departmentCode);
      
      return {
        message: `部門「${params.departmentCode}」を削除しました`
      };
    }
  );
}