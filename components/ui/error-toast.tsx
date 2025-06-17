/**
 * 統一エラー表示コンポーネント
 * ============================================================================
 * Shadcn/UI Toastを使用した統一エラー表示システム
 *
 * 主要機能:
 * 1. エラー種別に応じた適切な表示スタイル
 * 2. アクションボタン付きトースト
 * 3. フィールドレベルのバリデーションエラー表示
 * 4. 自動消去と手動制御
 * ============================================================================
 */

"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ErrorInfo,
  ErrorType,
  ErrorSeverity,
  DEFAULT_ERROR_DISPLAY,
  isRetryableError,
} from "@/lib/types/errors";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  RefreshCw,
  LogIn,
} from "lucide-react";

/**
 * エラー表示オプション
 */
interface ErrorToastOptions {
  /** 自動消去時間を上書き */
  duration?: number;
  /** アクションボタンのカスタムハンドラー */
  onAction?: () => void;
  /** 追加のアクションボタン */
  additionalActions?: Array<{
    label: string;
    onClick: () => void;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
  }>;
  /** トーストの位置を指定 */
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
}

/**
 * エラー種別に応じたアイコンを取得
 */
function getErrorIcon(errorType: ErrorType): React.ReactNode {
  const iconClass = "h-4 w-4";

  switch (errorType) {
    case ErrorType.VALIDATION:
      return <AlertTriangle className={iconClass} />;
    case ErrorType.BUSINESS:
      return <AlertCircle className={iconClass} />;
    case ErrorType.DATABASE:
    case ErrorType.NETWORK:
      return <RefreshCw className={iconClass} />;
    case ErrorType.AUTHORIZATION:
      return <LogIn className={iconClass} />;
    case ErrorType.SYSTEM:
      return <XCircle className={iconClass} />;
    default:
      return <Info className={iconClass} />;
  }
}

/**
 * 統一エラートースト表示関数
 */
export function showErrorToast(
  error: ErrorInfo,
  options: ErrorToastOptions = {}
): string {
  const config = DEFAULT_ERROR_DISPLAY[error.type];
  const severity = config.severity;
  const icon = getErrorIcon(error.type);

  // デフォルトの自動消去時間を設定
  const duration =
    options.duration ??
    (severity === ErrorSeverity.CRITICAL
      ? undefined // 重要なエラーは手動で閉じる
      : severity === ErrorSeverity.ERROR
      ? 8000
      : severity === ErrorSeverity.WARNING
      ? 6000
      : 4000);

  // アクションボタンの設定
  const actions: Array<{
    label: string;
    onClick: () => void;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
  }> = [];

  // デフォルトアクション（再試行など）
  if (config.showAction && isRetryableError(error)) {
    actions.push({
      label: config.actionLabel || "再試行",
      onClick: options.onAction || (() => window.location.reload()),
      variant: "outline",
    });
  }

  // 追加アクション
  if (options.additionalActions) {
    actions.push(...options.additionalActions);
  }

  // トースト表示
  const toastId = toast.error(error.message, {
    description: error.details?.suggestedAction,
    duration,
    icon,
    action:
      actions.length > 0 ? (
        <div className="flex gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              onClick={() => {
                action.onClick();
                toast.dismiss(toastId);
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : undefined,
    // エラーの詳細情報をdata属性として追加（デバッグ用）
    ...(process.env.NODE_ENV === "development" && {
      data: {
        errorType: error.type,
        errorCode: error.code,
        timestamp: error.timestamp,
      },
    }),
  });

  return String(toastId);
}

/**
 * バリデーションエラー専用表示関数
 */
export function showValidationError(
  message: string,
  fieldErrors?: Record<string, string[]>
): string {
  const description = fieldErrors
    ? Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
        .join("\n")
    : undefined;

  return String(
    toast.error(message, {
      description,
      duration: 6000,
      icon: <AlertTriangle className="h-4 w-4" />,
      action: description ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // フォームのエラーフィールドにスクロール
            const firstErrorField = document.querySelector(
              '[data-invalid="true"]'
            );
            if (firstErrorField) {
              firstErrorField.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              (firstErrorField as HTMLElement).focus();
            }
          }}
        >
          エラー箇所を確認
        </Button>
      ) : undefined,
    })
  );
}

/**
 * 成功メッセージ表示関数
 */
export function showSuccessToast(
  message: string,
  description?: string,
  duration: number = 4000
): string {
  return String(
    toast.success(message, {
      description,
      duration,
      icon: <Info className="h-4 w-4" />,
    })
  );
}

/**
 * 情報メッセージ表示関数
 */
export function showInfoToast(
  message: string,
  description?: string,
  duration: number = 4000
): string {
  return String(
    toast.info(message, {
      description,
      duration,
      icon: <Info className="h-4 w-4" />,
    })
  );
}

/**
 * 警告メッセージ表示関数
 */
export function showWarningToast(
  message: string,
  description?: string,
  duration: number = 6000
): string {
  return String(
    toast.warning(message, {
      description,
      duration,
      icon: <AlertTriangle className="h-4 w-4" />,
    })
  );
}

/**
 * 読み込み中トースト表示関数
 */
export function showLoadingToast(
  message: string = "処理中...",
  options: {
    onCancel?: () => void;
    cancelLabel?: string;
  } = {}
): string {
  return String(
    toast.loading(message, {
      duration: Infinity, // 手動で閉じるまで表示
      action: options.onCancel ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            options.onCancel?.();
            toast.dismiss();
          }}
        >
          {options.cancelLabel || "キャンセル"}
        </Button>
      ) : undefined,
    })
  );
}

/**
 * トーストを手動で閉じる
 */
export function dismissToast(toastId?: string): void {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
}

/**
 * 全てのトーストを閉じる
 */
export function dismissAllToasts(): void {
  toast.dismiss();
}

/**
 * React Hook Form用のエラー表示ヘルパー
 */
export function handleFormError(
  error: ErrorInfo,
  form?: {
    setError: (field: string, error: { message: string }) => void;
  }
): string {
  // フィールドレベルのエラーをフォームに設定
  if (error.details?.fieldErrors && form) {
    Object.entries(error.details.fieldErrors).forEach(([field, messages]) => {
      form.setError(field, { message: messages[0] });
    });
  }

  // トースト表示
  return showErrorToast(error);
}
