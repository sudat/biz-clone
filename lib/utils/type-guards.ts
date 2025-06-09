/**
 * 型ガードユーティリティ
 * ============================================================================
 * 実行時型検証とより安全な型変換のためのガード関数群
 * 
 * 主要機能:
 * 1. 基本型の型ガード
 * 2. オブジェクト構造の検証
 * 3. 配列型の型ガード
 * 4. 日本会計業務固有の型検証
 * ============================================================================
 */

// ====================
// 基本型ガード
// ====================

/**
 * 値がnullまたはundefinedでないことを確認
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 値が文字列かどうかを確認
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 値が数値かどうかを確認
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 値がブール値かどうかを確認
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 値がオブジェクト（nullではない）かどうかを確認
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 値が配列かどうかを確認
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * 値がDateオブジェクトかどうかを確認
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 値が有効なDate文字列かどうかを確認（ISO形式）
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

// ====================
// 複合型ガード
// ====================

/**
 * 値が指定されたキーを持つオブジェクトかどうかを確認
 */
export function hasKeys<K extends string>(
  value: unknown,
  keys: readonly K[]
): value is Record<K, unknown> {
  if (!isObject(value)) return false;
  
  return keys.every(key => key in value);
}

/**
 * 値が指定された必須キーを持つオブジェクトかどうかを確認
 */
export function hasRequiredKeys<K extends string>(
  value: unknown,
  requiredKeys: readonly K[]
): value is Record<K, unknown> {
  if (!isObject(value)) return false;
  
  return requiredKeys.every(key => 
    key in value && value[key] !== undefined && value[key] !== null
  );
}

/**
 * 配列の全要素が指定された型ガードを満たすかを確認
 */
export function isArrayOf<T>(
  value: unknown,
  elementGuard: (item: unknown) => item is T
): value is T[] {
  if (!isArray(value)) return false;
  
  return value.every(elementGuard);
}

/**
 * オブジェクトの全値が指定された型ガードを満たすかを確認
 */
export function isRecordOf<T>(
  value: unknown,
  valueGuard: (item: unknown) => item is T
): value is Record<string, T> {
  if (!isObject(value)) return false;
  
  return Object.values(value).every(valueGuard);
}

// ====================
// 日本会計業務固有型ガード
// ====================

/**
 * 勘定科目コードの型ガード
 */
export function isAccountCode(value: unknown): value is string {
  return isString(value) && 
         value.length > 0 && 
         value.length <= 10 &&
         /^[A-Z0-9]+$/.test(value);
}

/**
 * 補助科目コードの型ガード
 */
export function isSubAccountCode(value: unknown): value is string {
  return isString(value) && 
         value.length > 0 && 
         value.length <= 15 &&
         /^[A-Z0-9]+$/.test(value);
}

/**
 * 取引先コードの型ガード
 */
export function isPartnerCode(value: unknown): value is string {
  return isString(value) && 
         value.length > 0 && 
         value.length <= 15 &&
         /^[A-Z0-9]+$/.test(value);
}

/**
 * 分析コードの型ガード
 */
export function isAnalysisCode(value: unknown): value is string {
  return isString(value) && 
         value.length > 0 && 
         value.length <= 10 &&
         /^[A-Z0-9]+$/.test(value);
}

/**
 * 仕訳番号の型ガード（YYYYMMDDXXXXXXX形式）
 */
export function isJournalNumber(value: unknown): value is string {
  if (!isString(value)) return false;
  
  // 15桁の数字チェック
  if (!/^\d{15}$/.test(value)) return false;
  
  // 日付部分の妥当性チェック
  const dateStr = value.substring(0, 8);
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));
  
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  return true;
}

/**
 * 勘定科目タイプの型ガード
 */
export function isAccountType(value: unknown): value is '資産' | '負債' | '資本' | '収益' | '費用' {
  return isString(value) && 
         ['資産', '負債', '資本', '収益', '費用'].includes(value);
}

/**
 * 取引先タイプの型ガード
 */
export function isPartnerType(value: unknown): value is '得意先' | '仕入先' | '金融機関' | 'その他' {
  return isString(value) && 
         ['得意先', '仕入先', '金融機関', 'その他'].includes(value);
}

/**
 * 借方貸方区分の型ガード
 */
export function isDebitCredit(value: unknown): value is 'D' | 'C' {
  return isString(value) && (value === 'D' || value === 'C');
}

/**
 * 金額の型ガード（日本円）
 */
export function isAmount(value: unknown): value is number {
  return isNumber(value) && 
         value >= 0 && 
         value <= 999999999999 &&
         Number.isInteger(value);
}

// ====================
// マスタデータ型ガード
// ====================

/**
 * 勘定科目オブジェクトの型ガード
 */
export function isAccount(value: unknown): value is {
  account_code: string;
  account_name: string;
  account_type: string;
  is_active?: boolean;
} {
  return isObject(value) &&
         hasRequiredKeys(value, ['account_code', 'account_name', 'account_type'] as const) &&
         isAccountCode(value.account_code) &&
         isString(value.account_name) &&
         isAccountType(value.account_type);
}

/**
 * 補助科目オブジェクトの型ガード
 */
export function isSubAccount(value: unknown): value is {
  sub_account_code: string;
  sub_account_name: string;
  account_code: string;
  is_active?: boolean;
} {
  return isObject(value) &&
         hasRequiredKeys(value, ['sub_account_code', 'sub_account_name', 'account_code'] as const) &&
         isSubAccountCode(value.sub_account_code) &&
         isString(value.sub_account_name) &&
         isAccountCode(value.account_code);
}

/**
 * 取引先オブジェクトの型ガード
 */
export function isPartner(value: unknown): value is {
  partner_code: string;
  partner_name: string;
  partner_type: string;
  is_active?: boolean;
} {
  return isObject(value) &&
         hasRequiredKeys(value, ['partner_code', 'partner_name', 'partner_type'] as const) &&
         isPartnerCode(value.partner_code) &&
         isString(value.partner_name) &&
         isPartnerType(value.partner_type);
}

/**
 * 分析コードオブジェクトの型ガード
 */
export function isAnalysisCodeObject(value: unknown): value is {
  analysis_code: string;
  analysis_name: string;
  analysis_type: string;
  is_active?: boolean;
} {
  return isObject(value) &&
         hasRequiredKeys(value, ['analysis_code', 'analysis_name', 'analysis_type'] as const) &&
         isAnalysisCode(value.analysis_code) &&
         isString(value.analysis_name) &&
         isString(value.analysis_type);
}

// ====================
// バリデーション結果型
// ====================

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

/**
 * 型ガードの結果を詳細な情報とともに返す
 */
export function validateWithDetails<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage: string = '型チェックに失敗しました'
): ValidationResult<T> {
  if (guard(value)) {
    return {
      isValid: true,
      data: value,
      errors: []
    };
  }
  
  return {
    isValid: false,
    errors: [errorMessage]
  };
}

/**
 * 複数の型ガードを組み合わせて検証
 */
export function validateMultiple<T>(
  value: unknown,
  validators: Array<{
    guard: (value: unknown) => value is T;
    message: string;
  }>
): ValidationResult<T> {
  const errors: string[] = [];
  
  for (const validator of validators) {
    if (!validator.guard(value)) {
      errors.push(validator.message);
    }
  }
  
  if (errors.length === 0) {
    return {
      isValid: true,
      data: value as T,
      errors: []
    };
  }
  
  return {
    isValid: false,
    errors
  };
}

// ====================
// デバッグ用ユーティリティ
// ====================

/**
 * 型ガードの実行をログ出力する（開発環境のみ）
 */
export function logTypeCheck<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  label: string = 'TypeCheck'
): value is T {
  const result = guard(value);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${label}]`, {
      value,
      type: typeof value,
      isValid: result,
      constructor: value?.constructor?.name
    });
  }
  
  return result;
}

/**
 * オブジェクトの構造を詳細に検証してログ出力
 */
export function debugObjectStructure(value: unknown, label: string = 'Object'): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group(`[${label} Structure]`);
  console.log('Type:', typeof value);
  console.log('Constructor:', value?.constructor?.name);
  console.log('Is Array:', Array.isArray(value));
  console.log('Is Object:', isObject(value));
  
  if (isObject(value)) {
    console.log('Keys:', Object.keys(value));
    console.log('Values:', Object.values(value).map(v => typeof v));
  }
  
  console.log('Full Value:', value);
  console.groupEnd();
}