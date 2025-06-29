/**
 * Error Handler for API Routes
 * ============================================================================
 * 統一されたエラーハンドリングシステム
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiException, ApiErrorType, ApiResponse } from './types';

// ====================
// エラーハンドリング関数
// ====================

/**
 * APIエラーを統一形式でレスポンス
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  // カスタムAPIエラー
  if (error instanceof ApiException) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: {
          type: error.type,
          details: error.details,
          code: error.code
        }
      },
      { status: error.statusCode }
    );
  }

  // Zodバリデーションエラー
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'バリデーションエラーが発生しました',
        data: {
          type: ApiErrorType.VALIDATION,
          details: formatZodError(error)
        }
      },
      { status: 400 }
    );
  }

  // Prismaエラー
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return NextResponse.json(
      {
        success: false,
        error: 'データベース接続エラーが発生しました',
        data: {
          type: ApiErrorType.DATABASE,
          details: { message: 'Unknown database error' }
        }
      },
      { status: 500 }
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'データベースクエリの形式が正しくありません',
        data: {
          type: ApiErrorType.DATABASE,
          details: { message: error.message }
        }
      },
      { status: 400 }
    );
  }

  // 一般的なエラー
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: '予期しないエラーが発生しました',
        data: {
          type: ApiErrorType.INTERNAL,
          details: { message: error.message }
        }
      },
      { status: 500 }
    );
  }

  // その他の不明なエラー
  return NextResponse.json(
    {
      success: false,
      error: 'システムエラーが発生しました',
      data: {
        type: ApiErrorType.INTERNAL,
        details: { message: 'Unknown error occurred' }
      }
    },
    { status: 500 }
  );
}

// ====================
// 専用エラーハンドラー
// ====================

/**
 * Prismaエラーの詳細ハンドリング
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse<ApiResponse> {
  switch (error.code) {
    case 'P2002':
      // 一意制約違反
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'unknown field';
      return NextResponse.json(
        {
          success: false,
          error: `${target}は既に使用されています`,
          data: {
            type: ApiErrorType.BUSINESS,
            details: {
              constraint: target,
              code: error.code
            }
          }
        },
        { status: 409 }
      );

    case 'P2014':
      // 外部キー制約違反
      return NextResponse.json(
        {
          success: false,
          error: '関連するデータが存在しません',
          data: {
            type: ApiErrorType.BUSINESS,
            details: {
              message: '指定されたマスタデータが見つかりません',
              code: error.code
            }
          }
        },
        { status: 400 }
      );

    case 'P2003':
      // 外部キー制約違反（削除時）
      return NextResponse.json(
        {
          success: false,
          error: 'このデータは他の場所で使用されているため削除できません',
          data: {
            type: ApiErrorType.BUSINESS,
            details: {
              message: 'Foreign key constraint failed',
              code: error.code
            }
          }
        },
        { status: 409 }
      );

    case 'P2025':
      // レコードが見つからない
      return NextResponse.json(
        {
          success: false,
          error: '指定されたデータが見つかりません',
          data: {
            type: ApiErrorType.NOT_FOUND,
            details: {
              message: error.meta?.cause || 'Record not found',
              code: error.code
            }
          }
        },
        { status: 404 }
      );

    default:
      return NextResponse.json(
        {
          success: false,
          error: 'データベースエラーが発生しました',
          data: {
            type: ApiErrorType.DATABASE,
            details: {
              message: error.message,
              code: error.code
            }
          }
        },
        { status: 500 }
      );
  }
}

/**
 * Zodエラーの詳細フォーマット
 */
function formatZodError(error: ZodError) {
  return {
    issues: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    })),
    formattedMessage: error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')
  };
}

// ====================
// 成功レスポンス
// ====================

/**
 * 成功レスポンスを統一形式で返す
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

/**
 * 作成成功レスポンス
 */
export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, 201);
}

/**
 * 削除成功レスポンス
 */
export function deletedResponse(message: string = 'データを削除しました'): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: true,
      message
    },
    { status: 200 }
  );
}

// ====================
// ビジネスロジックエラー
// ====================

/**
 * ビジネスルール違反エラーを生成
 */
export function createBusinessError(message: string, details?: any): ApiException {
  return new ApiException(
    ApiErrorType.BUSINESS,
    message,
    422,
    details
  );
}

/**
 * データ重複エラーを生成
 */
export function createDuplicateError(field: string, value: string): ApiException {
  return new ApiException(
    ApiErrorType.BUSINESS,
    `${field}「${value}」は既に使用されています`,
    409,
    { field, value }
  );
}

/**
 * データ未発見エラーを生成
 */
export function createNotFoundError(resource: string, identifier?: string): ApiException {
  const message = identifier 
    ? `${resource}「${identifier}」が見つかりません`
    : `${resource}が見つかりません`;
    
  return new ApiException(
    ApiErrorType.NOT_FOUND,
    message,
    404,
    { resource, identifier }
  );
}