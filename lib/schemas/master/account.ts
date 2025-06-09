/**
 * 勘定科目マスタスキーマ
 * ============================================================================
 * 勘定科目の作成・更新・検索に関するバリデーションスキーマ
 * 
 * 主要機能:
 * 1. 勘定科目の新規作成・更新フォーム用スキーマ
 * 2. 階層構造（親子関係）のバリデーション
 * 3. 5大区分の制約チェック
 * 4. 検索フィルター用スキーマ
 * ============================================================================
 */

import { z } from "zod";
import { 
  accountCodeField, 
  createNameField, 
  createKanaField,
  sortOrderField,
  isActiveField,
  createMemoField
} from "../common/base-fields";
import { accountTypeField } from "../common/validation-rules";

/**
 * 勘定科目作成スキーマ
 */
export const createAccountSchema = z.object({
  account_code: accountCodeField,
  account_name: createNameField("勘定科目", 100),
  account_name_kana: createKanaField("勘定科目", 100),
  account_type: accountTypeField,
  parent_account_code: z.string()
    .max(10, "親科目コードは10文字以内で入力してください")
    .optional()
    .nullable(),
  is_detail: z.boolean().default(true),
  sort_order: sortOrderField,
  is_active: isActiveField,
  notes: createMemoField("備考", 500)
}).refine((data) => {
  // 親科目が設定されている場合は明細科目である必要がある
  if (data.parent_account_code && !data.is_detail) {
    return false;
  }
  // 明細科目でない場合は親科目を設定できない
  if (!data.is_detail && data.parent_account_code) {
    return false;
  }
  return true;
}, {
  message: "親科目が設定されている場合は明細科目として設定してください",
  path: ["is_detail"]
});

/**
 * 勘定科目更新スキーマ
 */
export const updateAccountSchema = createAccountSchema.partial().extend({
  account_code: accountCodeField // コードは必須のまま
});

/**
 * 勘定科目検索スキーマ
 */
export const accountSearchSchema = z.object({
  account_code: z.string().max(10).optional(),
  account_name: z.string().max(100).optional(),
  account_type: accountTypeField.optional(),
  parent_account_code: z.string().max(10).optional().nullable(),
  is_detail: z.boolean().optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional() // 横断検索用
});

/**
 * 勘定科目一覧フィルタースキーマ
 */
export const accountFilterSchema = z.object({
  account_type: accountTypeField.optional(),
  is_active: z.boolean().optional(),
  parent_only: z.boolean().optional(), // 親科目のみ表示
  search: z.string().max(100).optional()
});

/**
 * 勘定科目階層検証スキーマ
 */
export const accountHierarchySchema = z.object({
  account_code: accountCodeField,
  parent_account_code: z.string().max(10).optional().nullable()
}).refine(async (data) => {
  // 自己参照チェック
  if (data.parent_account_code === data.account_code) {
    return false;
  }
  
  // TODO: 循環参照チェック（データベースクエリが必要）
  // この部分は実際のServer Action内で追加検証を行う
  
  return true;
}, {
  message: "自己参照または循環参照は設定できません",
  path: ["parent_account_code"]
});

/**
 * 勘定科目削除検証スキーマ
 */
export const deleteAccountSchema = z.object({
  account_code: accountCodeField
});

/**
 * 勘定科目コピースキーマ
 */
export const copyAccountSchema = z.object({
  source_account_code: accountCodeField,
  new_account_code: accountCodeField,
  new_account_name: createNameField("勘定科目", 100),
  copy_sub_accounts: z.boolean().default(false)
});

/**
 * 勘定科目インポートスキーマ（CSVアップロード用）
 */
export const importAccountSchema = z.object({
  accounts: z.array(createAccountSchema)
    .min(1, "少なくとも1つの勘定科目が必要です")
    .max(1000, "一度にインポートできる勘定科目は1000件までです")
}).refine((data) => {
  // 重複コードチェック
  const codes = data.accounts.map(acc => acc.account_code);
  const uniqueCodes = new Set(codes);
  return codes.length === uniqueCodes.size;
}, {
  message: "重複する勘定科目コードが含まれています",
  path: ["accounts"]
});

/**
 * 勘定科目ソートスキーマ
 */
export const accountSortSchema = z.object({
  sort_field: z.enum([
    "account_code", 
    "account_name", 
    "account_type", 
    "sort_order",
    "created_at",
    "updated_at"
  ]),
  sort_direction: z.enum(["asc", "desc"]).default("asc")
});

/**
 * TypeScript型定義
 */
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountSearchInput = z.infer<typeof accountSearchSchema>;
export type AccountFilterInput = z.infer<typeof accountFilterSchema>;
export type AccountHierarchyInput = z.infer<typeof accountHierarchySchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type CopyAccountInput = z.infer<typeof copyAccountSchema>;
export type ImportAccountInput = z.infer<typeof importAccountSchema>;
export type AccountSortInput = z.infer<typeof accountSortSchema>;