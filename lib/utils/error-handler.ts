/**
 * エラーハンドリングユーティリティ
 * ============================================================================
 * アプリケーション全体で使用される統一エラーハンドリング機能
 * 
 * 主要機能:
 * 1. Prismaエラーの変換・処理
 * 2. Server Actionエラーの標準化
 * 3. NEXT_REDIRECT例外の適切な処理
 * 4. エラーログの構造化出力
 * ============================================================================
 */

import { Prisma } from '@prisma/client';
import { 
  ErrorType, 
  ErrorInfo, 
  ServiceResult, 
  ActionResult, 
  ERROR_MESSAGES,
  ErrorSeverity,
  DEFAULT_ERROR_DISPLAY 
} from '@/lib/types/errors';

/**
 * Prismaエラーかどうかを判定（簡略版）
 */
export function isPrismaError(error: unknown): boolean {
  return !!(error && typeof error === 'object' && 'code' in error);
}

/**
 * NEXT_REDIRECTエラーかどうかを判定
 */
export function isRedirectError(error: unknown): boolean {
  return error instanceof Error && error.message === "NEXT_REDIRECT";
}

/**
 * Prismaエラーを統一エラー形式に変換
 */
export function handlePrismaError(
  error: any,
  operation: string,
  entityName?: string
): ServiceResult<never> {
  const timestamp = new Date().toISOString();
  
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      const target = Array.isArray(error.meta?.target) ? error.meta.target[0] : 'コード';
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: ERROR_MESSAGES.BUSINESS.DUPLICATE_CODE(
            entityName || 'データ', 
            String(target)
          ),
          details: {
            constraintType: 'unique',
            originalError: error.message,
            retryable: false
          },
          code: error.code,
          timestamp
        }
      };

    case 'P2003': // Foreign key constraint violation
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: ERROR_MESSAGES.DATABASE.FOREIGN_KEY_CONSTRAINT,
          details: {
            constraintType: 'foreign_key',
            originalError: error.message,
            retryable: false,
            suggestedAction: '関連するデータを確認してください'
          },
          code: error.code,
          timestamp
        }
      };

    case 'P2025': // Record not found
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: ERROR_MESSAGES.BUSINESS.NOT_FOUND(entityName || 'データ'),
          details: {
            originalError: error.message,
            retryable: false
          },
          code: error.code,
          timestamp
        }
      };

    case 'P1001': // Database connection error
    case 'P1002': // Database timeout
      return {
        success: false,
        error: {
          type: ErrorType.DATABASE,
          message: ERROR_MESSAGES.DATABASE.CONNECTION_ERROR,
          details: {
            originalError: error.message,
            retryable: true,
            suggestedAction: 'しばらく経ってから再試行してください'
          },
          code: error.code,
          timestamp
        }
      };

    default:
      return {
        success: false,
        error: {
          type: ErrorType.DATABASE,
          message: `${operation}中にデータベースエラーが発生しました`,
          details: {
            originalError: error.message,
            retryable: true
          },
          code: error.code,
          timestamp
        }
      };
  }
}

/**
 * Server Action用の統一エラーハンドラー
 */
export function handleServerActionError(
  error: unknown,
  operation: string,
  entityName?: string
): ActionResult<never> {
  // NEXT_REDIRECTは再スローして Next.js に処理を委ねる
  if (isRedirectError(error)) {
    throw error;
  }

  const timestamp = new Date().toISOString();

  // Prismaエラーの処理
  if (isPrismaError(error)) {
    const result = handlePrismaError(error, operation, entityName);
    return {
      success: false,
      error: result.error!,
      message: result.error!.message
    };
  }

  // バリデーションエラー（Zodエラー）
  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      success: false,
      error: {
        type: ErrorType.VALIDATION,
        message: ERROR_MESSAGES.VALIDATION.INVALID_FORMAT('入力値'),
        details: {
          originalError: JSON.stringify(error),
          retryable: false
        },
        timestamp
      },
      message: '入力内容を確認してください'
    };
  }

  // その他のエラー
  const errorMessage = error instanceof Error ? error.message : '不明なエラー';
  
  console.error(`[ERROR] ${operation}:`, {
    error: errorMessage,
    operation,
    entityName,
    timestamp,
    stack: error instanceof Error ? error.stack : undefined
  });

  return {
    success: false,
    error: {
      type: ErrorType.SYSTEM,
      message: `${operation}中に予期しないエラーが発生しました`,
      details: {
        originalError: errorMessage,
        retryable: true,
        suggestedAction: 'しばらく経ってから再試行してください'
      },
      timestamp
    },
    message: ERROR_MESSAGES.SYSTEM.UNKNOWN_ERROR
  };
}

/**
 * アダプター層用のエラーハンドラー
 */
export function handleAdapterError(
  error: unknown,
  operation: string,
  fallbackData?: any
): ServiceResult<any> {
  // NEXT_REDIRECTは成功として扱う（Server Actionでリダイレクトが発生）
  if (isRedirectError(error)) {
    return {
      success: true,
      data: fallbackData
    };
  }

  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : '不明なエラー';

  console.error(`[ADAPTER ERROR] ${operation}:`, {
    error: errorMessage,
    operation,
    timestamp,
    stack: error instanceof Error ? error.stack : undefined
  });

  return {
    success: false,
    error: {
      type: ErrorType.SYSTEM,
      message: `${operation}に失敗しました`,
      details: {
        originalError: errorMessage,
        retryable: true
      },
      timestamp
    }
  };
}

/**
 * バリデーションエラーを統一形式に変換
 */
export function createValidationError(
  fieldErrors: Record<string, string[]>,
  message: string = '入力内容に不備があります'
): ErrorInfo {
  return {
    type: ErrorType.VALIDATION,
    message,
    details: {
      fieldErrors,
      retryable: false,
      suggestedAction: 'エラーが表示されているフィールドを修正してください'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * ビジネスロジックエラーを作成
 */
export function createBusinessError(
  message: string,
  details?: Partial<ErrorInfo['details']>
): ErrorInfo {
  return {
    type: ErrorType.BUSINESS,
    message,
    details: {
      retryable: false,
      ...details
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * システムエラーを作成
 */
export function createSystemError(
  message: string = ERROR_MESSAGES.SYSTEM.UNKNOWN_ERROR,
  originalError?: string
): ErrorInfo {
  return {
    type: ErrorType.SYSTEM,
    message,
    details: {
      originalError,
      retryable: true,
      suggestedAction: 'ページを再読み込みするか、しばらく経ってから再試行してください'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * エラー重要度を取得
 */
export function getErrorSeverity(errorType: ErrorType): ErrorSeverity {
  return DEFAULT_ERROR_DISPLAY[errorType].severity;
}

/**
 * エラーが再試行可能かどうかを判定
 */
export function isRetryableError(error: ErrorInfo): boolean {
  return error.details?.retryable ?? false;
}

/**
 * エラーログを構造化形式で出力
 */
export function logError(
  error: ErrorInfo,
  context?: {
    userId?: string;
    operation?: string;
    additionalData?: Record<string, any>;
  }
): void {
  const logEntry = {
    timestamp: error.timestamp || new Date().toISOString(),
    level: getErrorSeverity(error.type),
    type: error.type,
    message: error.message,
    code: error.code,
    field: error.field,
    details: error.details,
    context
  };

  // 開発環境では詳細ログ、本番環境では最小限のログ
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR LOG]', logEntry);
  } else {
    // 本番環境ではセンシティブな情報を除外
    const productionLogEntry = {
      ...logEntry,
      details: {
        retryable: logEntry.details?.retryable,
        constraintType: logEntry.details?.constraintType
      }
    };
    console.error('[ERROR LOG]', productionLogEntry);
  }
}

/**
 * FormData検証エラーを作成（Server Actions用）
 */
export function createFormValidationError(
  errors: Record<string, string[]>
): ActionResult<never> {
  return {
    success: false,
    error: createValidationError(errors),
    message: '入力内容を確認してください'
  };
}