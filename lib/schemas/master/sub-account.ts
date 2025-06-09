/**
 * 補助科目マスタスキーマ
 * ============================================================================
 * 補助科目の作成・更新・検索に関するバリデーションスキーマ
 * 
 * 主要機能:
 * 1. 補助科目の新規作成・更新フォーム用スキーマ
 * 2. 勘定科目との関連性チェック
 * 3. 補助科目固有の制約バリデーション
 * 4. 検索フィルター用スキーマ
 * ============================================================================
 */

import { z } from "zod";
import { 
  subAccountCodeField, 
  accountCodeField,
  createNameField, 
  createKanaField,
  sortOrderField,
  isActiveField,
  createMemoField
} from "../common/base-fields";

/**
 * 補助科目作成スキーマ
 */
export const createSubAccountSchema = z.object({
  sub_account_code: subAccountCodeField,
  sub_account_name: createNameField("補助科目", 100),
  sub_account_name_kana: createKanaField("補助科目", 100),
  account_code: accountCodeField,
  sort_order: sortOrderField,
  is_active: isActiveField,
  notes: createMemoField("備考", 500)
});

/**
 * 補助科目更新スキーマ
 */
export const updateSubAccountSchema = createSubAccountSchema.partial().extend({
  sub_account_code: subAccountCodeField, // コードは必須のまま
  account_code: accountCodeField // 関連する勘定科目コードも必須
});

/**
 * 補助科目検索スキーマ
 */
export const subAccountSearchSchema = z.object({
  sub_account_code: z.string().max(15).optional(),
  sub_account_name: z.string().max(100).optional(),
  account_code: accountCodeField.optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional() // 横断検索用
});

/**
 * 補助科目一覧フィルタースキーマ
 */
export const subAccountFilterSchema = z.object({
  account_code: accountCodeField.optional(),
  account_type: z.enum(["資産", "負債", "資本", "収益", "費用"]).optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional()
});

/**
 * 補助科目削除検証スキーマ
 */
export const deleteSubAccountSchema = z.object({
  sub_account_code: subAccountCodeField,
  account_code: accountCodeField
});

/**
 * 補助科目コピースキーマ
 */
export const copySubAccountSchema = z.object({
  source_sub_account_code: subAccountCodeField,
  source_account_code: accountCodeField,
  new_sub_account_code: subAccountCodeField,
  new_sub_account_name: createNameField("補助科目", 100),
  target_account_code: accountCodeField
});

/**
 * 補助科目一括移動スキーマ
 */
export const moveSubAccountsSchema = z.object({
  sub_account_codes: z.array(subAccountCodeField)
    .min(1, "移動する補助科目を選択してください")
    .max(100, "一度に移動できる補助科目は100件までです"),
  source_account_code: accountCodeField,
  target_account_code: accountCodeField
}).refine((data) => {
  return data.source_account_code !== data.target_account_code;
}, {
  message: "移動元と移動先の勘定科目が同じです",
  path: ["target_account_code"]
});

/**
 * 補助科目インポートスキーマ（CSVアップロード用）
 */
export const importSubAccountSchema = z.object({
  sub_accounts: z.array(createSubAccountSchema)
    .min(1, "少なくとも1つの補助科目が必要です")
    .max(1000, "一度にインポートできる補助科目は1000件までです")
}).refine((data) => {
  // 重複コードチェック（同一勘定科目内での重複）
  const accountGroups = new Map<string, string[]>();
  
  for (const subAccount of data.sub_accounts) {
    const { account_code, sub_account_code } = subAccount;
    if (!accountGroups.has(account_code)) {
      accountGroups.set(account_code, []);
    }
    accountGroups.get(account_code)!.push(sub_account_code);
  }
  
  // 各勘定科目グループ内での重複チェック
  for (const [accountCode, subAccountCodes] of accountGroups) {
    const uniqueCodes = new Set(subAccountCodes);
    if (subAccountCodes.length !== uniqueCodes.size) {
      return false;
    }
  }
  
  return true;
}, {
  message: "同一勘定科目内で重複する補助科目コードが含まれています",
  path: ["sub_accounts"]
});

/**
 * 補助科目ソートスキーマ
 */
export const subAccountSortSchema = z.object({
  sort_field: z.enum([
    "sub_account_code", 
    "sub_account_name", 
    "account_code",
    "sort_order",
    "created_at",
    "updated_at"
  ]),
  sort_direction: z.enum(["asc", "desc"]).default("asc")
});

/**
 * 補助科目統計スキーマ（レポート用）
 */
export const subAccountStatsSchema = z.object({
  account_code: accountCodeField.optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  include_inactive: z.boolean().default(false)
});

/**
 * TypeScript型定義
 */
export type CreateSubAccountInput = z.infer<typeof createSubAccountSchema>;
export type UpdateSubAccountInput = z.infer<typeof updateSubAccountSchema>;
export type SubAccountSearchInput = z.infer<typeof subAccountSearchSchema>;
export type SubAccountFilterInput = z.infer<typeof subAccountFilterSchema>;
export type DeleteSubAccountInput = z.infer<typeof deleteSubAccountSchema>;
export type CopySubAccountInput = z.infer<typeof copySubAccountSchema>;
export type MoveSubAccountsInput = z.infer<typeof moveSubAccountsSchema>;
export type ImportSubAccountInput = z.infer<typeof importSubAccountSchema>;
export type SubAccountSortInput = z.infer<typeof subAccountSortSchema>;
export type SubAccountStatsInput = z.infer<typeof subAccountStatsSchema>;