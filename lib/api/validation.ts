/**
 * Validation Middleware for API Routes
 * ============================================================================
 * リクエストバリデーションとハンドラー統合システム
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireScopes, createMockAuth, isPublicEndpoint } from './auth';
import { handleApiError, successResponse } from './error-handler';
import { ApiResponse, AuthContext } from './types';

// ====================
// バリデーション関数
// ====================

/**
 * Zodスキーマを使用してデータをバリデーション
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * リクエストボディをバリデーション
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return validateWithSchema(schema, body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

/**
 * クエリパラメータをバリデーション
 */
export function validateSearchParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): T {
  const { searchParams } = new URL(request.url);
  const params: Record<string, any> = {};

  for (const [key, value] of searchParams.entries()) {
    // 数値の自動変換
    if (/^\d+$/.test(value)) {
      params[key] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      params[key] = parseFloat(value);
    } else if (value === 'true' || value === 'false') {
      params[key] = value === 'true';
    } else {
      params[key] = value;
    }
  }

  return validateWithSchema(schema, params);
}

// ====================
// API ハンドラー統合
// ====================

/**
 * 統合APIハンドラー（認証・バリデーション・実行）
 */
export async function validateAndExecute<TInput, TOutput>(
  request: NextRequest,
  options: {
    bodySchema?: z.ZodSchema<TInput>;
    querySchema?: z.ZodSchema<any>;
    requiredScopes?: string[];
    allowPublic?: boolean;
  },
  handler: (data: TInput, params: any, auth: AuthContext) => Promise<TOutput>
): Promise<NextResponse<ApiResponse<TOutput>>> {
  try {
    // 認証処理 - MVP用に認証をデフォルト無効化（allowPublic: true がデフォルト）
    let auth: AuthContext;
    const isPublic = options.allowPublic !== false || isPublicEndpoint(new URL(request.url).pathname);
    
    if (isPublic) {
      auth = createMockAuth();
    } else {
      auth = await authenticateRequest(request);
      
      // スコープチェック
      if (options.requiredScopes?.length) {
        requireScopes(options.requiredScopes)(auth);
      }
    }

    // クエリパラメータのバリデーション
    let validatedParams: any = {};
    if (options.querySchema) {
      validatedParams = validateSearchParams(request, options.querySchema);
    }

    // リクエストボディのバリデーション
    let validatedData: TInput;
    if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      validatedData = await validateRequestBody(request, options.bodySchema);
    } else {
      validatedData = {} as TInput;
    }

    // ハンドラー実行
    const result = await handler(validatedData, validatedParams, auth);

    return successResponse(result);

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GETリクエスト専用のハンドラー
 */
export async function handleGetRequest<TQuery, TOutput>(
  request: NextRequest,
  options: {
    querySchema?: z.ZodSchema<TQuery>;
    requiredScopes?: string[];
    allowPublic?: boolean;
  },
  handler: (params: TQuery, auth: AuthContext) => Promise<TOutput>
): Promise<NextResponse<ApiResponse<TOutput>>> {
  return validateAndExecute(
    request,
    {
      querySchema: options.querySchema,
      requiredScopes: options.requiredScopes,
      allowPublic: options.allowPublic !== false // デフォルトをtrueに変更
    },
    async (_, params, auth) => handler(params, auth)
  );
}

/**
 * POSTリクエスト専用のハンドラー
 */
export async function handlePostRequest<TInput, TOutput>(
  request: NextRequest,
  options: {
    bodySchema: z.ZodSchema<TInput>;
    requiredScopes?: string[];
    allowPublic?: boolean;
  },
  handler: (data: TInput, auth: AuthContext) => Promise<TOutput>
): Promise<NextResponse<ApiResponse<TOutput>>> {
  return validateAndExecute(
    request,
    {
      bodySchema: options.bodySchema,
      requiredScopes: options.requiredScopes,
      allowPublic: options.allowPublic !== false // デフォルトをtrueに変更
    },
    async (data, _, auth) => handler(data, auth)
  );
}

/**
 * PUTリクエスト専用のハンドラー
 */
export async function handlePutRequest<TInput, TOutput>(
  request: NextRequest,
  options: {
    bodySchema: z.ZodSchema<TInput>;
    querySchema?: z.ZodSchema<any>;
    requiredScopes?: string[];
    allowPublic?: boolean;
  },
  handler: (data: TInput, params: any, auth: AuthContext) => Promise<TOutput>
): Promise<NextResponse<ApiResponse<TOutput>>> {
  return validateAndExecute(
    request,
    {
      bodySchema: options.bodySchema,
      querySchema: options.querySchema,
      requiredScopes: options.requiredScopes,
      allowPublic: options.allowPublic !== false // デフォルトをtrueに変更
    },
    handler
  );
}

/**
 * DELETEリクエスト専用のハンドラー
 */
export async function handleDeleteRequest<TQuery, TOutput>(
  request: NextRequest,
  options: {
    querySchema?: z.ZodSchema<TQuery>;
    requiredScopes?: string[];
    allowPublic?: boolean;
  },
  handler: (params: TQuery, auth: AuthContext) => Promise<TOutput>
): Promise<NextResponse<ApiResponse<TOutput>>> {
  return validateAndExecute(
    request,
    {
      querySchema: options.querySchema,
      requiredScopes: options.requiredScopes,
      allowPublic: options.allowPublic !== false // デフォルトをtrueに変更
    },
    async (_, params, auth) => handler(params, auth)
  );
}

// ====================
// 一般的なスキーマ
// ====================

/**
 * ページネーション用スキーマ
 */
export const paginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional()
});

/**
 * 検索用スキーマ
 */
export const searchSchema = paginationSchema.extend({
  searchTerm: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

/**
 * 日付範囲検索用スキーマ
 */
export const dateRangeSchema = z.object({
  fromDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "有効な開始日を入力してください"
  }).optional(),
  toDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "有効な終了日を入力してください"
  }).optional()
});

/**
 * IDパラメータ用スキーマ
 */
export const idParamSchema = z.object({
  id: z.string().min(1, "IDは必須です")
});

/**
 * コードパラメータ用スキーマ
 */
export const codeParamSchema = z.object({
  code: z.string().min(1, "コードは必須です")
});