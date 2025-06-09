/**
 * エラーハンドリング統一型定義
 * ============================================================================
 * アプリケーション全体で使用される統一エラー型とレスポンス型を定義
 * 
 * 使用目的:
 * 1. Server Actions・UIコンポーネント間の一貫したエラーハンドリング
 * 2. 型安全なエラー処理
 * 3. ユーザーフレンドリーなエラーメッセージ表示
 * ============================================================================
 */

/**
 * エラー種別の定義
 */
export enum ErrorType {
  /** バリデーションエラー（入力値検証失敗） */
  VALIDATION = 'validation',
  /** ビジネスロジックエラー（重複、制約違反等） */
  BUSINESS = 'business',
  /** データベースエラー（接続、クエリ失敗等） */
  DATABASE = 'database',
  /** ネットワークエラー（通信失敗） */
  NETWORK = 'network',
  /** 認証・認可エラー */
  AUTHORIZATION = 'authorization',
  /** システムエラー（予期しないエラー） */
  SYSTEM = 'system'
}

/**
 * エラー詳細情報
 */
export interface ErrorDetails {
  /** フィールドレベルのバリデーションエラー */
  fieldErrors?: Record<string, string[]>;
  /** データベース制約の種類 */
  constraintType?: 'unique' | 'foreign_key' | 'check' | 'not_null';
  /** 元のエラーメッセージ（デバッグ用） */
  originalError?: string;
  /** 再試行可能かどうか */
  retryable?: boolean;
  /** 関連するエンティティID */
  entityId?: string;
  /** 推奨されるユーザーアクション */
  suggestedAction?: string;
}

/**
 * エラー情報
 */
export interface ErrorInfo {
  /** エラーの種別 */
  type: ErrorType;
  /** ユーザー向けエラーメッセージ */
  message: string;
  /** エラーの詳細情報 */
  details?: ErrorDetails;
  /** エラーコード（ログ・トラッキング用） */
  code?: string;
  /** エラーが発生したフィールド名 */
  field?: string;
  /** タイムスタンプ */
  timestamp?: string;
}

/**
 * 統一サービスレスポンス型
 */
export type ServiceResult<T = void> = 
  | { success: true; data: T; error?: never }
  | { success: false; error: ErrorInfo; data?: never };

/**
 * Server Actionレスポンス型（FormDataベース）
 */
export type ActionResult<T = void> = 
  | { success: true; data?: T; message?: string }
  | { success: false; error: ErrorInfo; message?: string };

/**
 * エラーメッセージ定数
 */
export const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED: (field: string) => `${field}は必須項目です`,
    INVALID_FORMAT: (field: string) => `${field}の形式が正しくありません`,
    TOO_LONG: (field: string, max: number) => `${field}は${max}文字以内で入力してください`,
    TOO_SHORT: (field: string, min: number) => `${field}は${min}文字以上で入力してください`,
    INVALID_EMAIL: 'メールアドレスの形式が正しくありません',
    INVALID_NUMBER: '数値を入力してください',
    INVALID_DATE: '有効な日付を入力してください'
  },
  BUSINESS: {
    DUPLICATE_CODE: (entity: string, code: string) => 
      `${entity}コード「${code}」は既に使用されています。別のコードを指定してください`,
    NOT_FOUND: (entity: string) => `指定された${entity}が見つかりません`,
    CANNOT_DELETE: (entity: string, reason: string) => 
      `${entity}を削除できません。${reason}`,
    INVALID_OPERATION: (operation: string) => `${operation}は実行できません`,
    CONSTRAINT_VIOLATION: '関連するデータが存在するため操作できません'
  },
  SYSTEM: {
    NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください',
    SERVER_ERROR: 'サーバーエラーが発生しました。しばらく経ってから再試行してください',
    UNKNOWN_ERROR: '予期しないエラーが発生しました',
    TIMEOUT_ERROR: 'タイムアウトが発生しました。再試行してください',
    PERMISSION_DENIED: 'この操作を実行する権限がありません'
  },
  DATABASE: {
    CONNECTION_ERROR: 'データベース接続エラーが発生しました',
    TRANSACTION_ERROR: 'データベース処理中にエラーが発生しました',
    UNIQUE_CONSTRAINT: '重複するデータが存在します',
    FOREIGN_KEY_CONSTRAINT: '関連するデータが見つかりません'
  }
} as const;

/**
 * エラー重要度レベル
 */
export enum ErrorSeverity {
  /** 情報メッセージ */
  INFO = 'info',
  /** 警告 */
  WARNING = 'warning',
  /** エラー */
  ERROR = 'error',
  /** 致命的エラー */
  CRITICAL = 'critical'
}

/**
 * エラー表示設定
 */
export interface ErrorDisplayConfig {
  /** 表示するエラーレベル */
  severity: ErrorSeverity;
  /** 自動で消去するかどうか */
  autoHide: boolean;
  /** 自動消去までの時間（ミリ秒） */
  autoHideDelay?: number;
  /** アクションボタンを表示するかどうか */
  showAction: boolean;
  /** アクションボタンのラベル */
  actionLabel?: string;
  /** アクション実行時のコールバック */
  onAction?: () => void;
}

/**
 * エラー表示設定のデフォルト値
 */
export const DEFAULT_ERROR_DISPLAY: Record<ErrorType, ErrorDisplayConfig> = {
  [ErrorType.VALIDATION]: {
    severity: ErrorSeverity.WARNING,
    autoHide: false,
    showAction: false
  },
  [ErrorType.BUSINESS]: {
    severity: ErrorSeverity.ERROR,
    autoHide: false,
    showAction: false
  },
  [ErrorType.DATABASE]: {
    severity: ErrorSeverity.ERROR,
    autoHide: false,
    showAction: true,
    actionLabel: '再試行'
  },
  [ErrorType.NETWORK]: {
    severity: ErrorSeverity.ERROR,
    autoHide: false,
    showAction: true,
    actionLabel: '再試行'
  },
  [ErrorType.AUTHORIZATION]: {
    severity: ErrorSeverity.ERROR,
    autoHide: false,
    showAction: true,
    actionLabel: 'ログイン'
  },
  [ErrorType.SYSTEM]: {
    severity: ErrorSeverity.CRITICAL,
    autoHide: false,
    showAction: true,
    actionLabel: '再読み込み'
  }
};