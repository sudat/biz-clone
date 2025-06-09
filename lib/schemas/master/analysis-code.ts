/**
 * 分析コードマスタスキーマ
 * ============================================================================
 * 分析コードの作成・更新・検索に関するバリデーションスキーマ
 * 
 * 主要機能:
 * 1. 分析コードの新規作成・更新フォーム用スキーマ
 * 2. 分析タイプによる制約チェック
 * 3. 分析コード固有の制約バリデーション
 * 4. 検索フィルター用スキーマ
 * ============================================================================
 */

import { z } from "zod";
import { 
  analysisCodeField, 
  createNameField, 
  createKanaField,
  sortOrderField,
  isActiveField,
  createMemoField
} from "../common/base-fields";
import { analysisCodeTypeField } from "../common/validation-rules";

/**
 * 分析コード作成スキーマ
 */
export const createAnalysisCodeSchema = z.object({
  analysis_code: analysisCodeField,
  analysis_name: createNameField("分析コード", 100),
  analysis_name_kana: createKanaField("分析コード", 100),
  analysis_type: analysisCodeTypeField,
  parent_analysis_code: z.string()
    .max(10, "親分析コードは10文字以内で入力してください")
    .optional()
    .nullable(),
  is_leaf: z.boolean().default(true), // 末端ノードかどうか
  sort_order: sortOrderField,
  is_active: isActiveField,
  notes: createMemoField("備考", 500)
}).refine((data) => {
  // 親分析コードが設定されている場合は末端ノードである必要がある
  if (data.parent_analysis_code && !data.is_leaf) {
    return false;
  }
  return true;
}, {
  message: "親分析コードが設定されている場合は末端ノードとして設定してください",
  path: ["is_leaf"]
});

/**
 * 分析コード更新スキーマ
 */
export const updateAnalysisCodeSchema = createAnalysisCodeSchema.partial().extend({
  analysis_code: analysisCodeField // コードは必須のまま
});

/**
 * 分析コード検索スキーマ
 */
export const analysisCodeSearchSchema = z.object({
  analysis_code: z.string().max(10).optional(),
  analysis_name: z.string().max(100).optional(),
  analysis_type: z.string().max(50).optional(),
  parent_analysis_code: z.string().max(10).optional().nullable(),
  is_leaf: z.boolean().optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional() // 横断検索用
});

/**
 * 分析コード一覧フィルタースキーマ
 */
export const analysisCodeFilterSchema = z.object({
  analysis_type: z.string().max(50).optional(),
  parent_analysis_code: z.string().max(10).optional().nullable(),
  is_leaf: z.boolean().optional(),
  is_active: z.boolean().optional(),
  root_only: z.boolean().optional(), // ルートノードのみ表示
  search: z.string().max(100).optional()
});

/**
 * 分析コード階層検証スキーマ
 */
export const analysisCodeHierarchySchema = z.object({
  analysis_code: analysisCodeField,
  parent_analysis_code: z.string().max(10).optional().nullable()
}).refine(async (data) => {
  // 自己参照チェック
  if (data.parent_analysis_code === data.analysis_code) {
    return false;
  }
  
  // TODO: 循環参照チェック（データベースクエリが必要）
  // この部分は実際のServer Action内で追加検証を行う
  
  return true;
}, {
  message: "自己参照または循環参照は設定できません",
  path: ["parent_analysis_code"]
});

/**
 * 分析コード削除検証スキーマ
 */
export const deleteAnalysisCodeSchema = z.object({
  analysis_code: analysisCodeField
});

/**
 * 分析コードコピースキーマ
 */
export const copyAnalysisCodeSchema = z.object({
  source_analysis_code: analysisCodeField,
  new_analysis_code: analysisCodeField,
  new_analysis_name: createNameField("分析コード", 100),
  copy_children: z.boolean().default(false), // 子ノードもコピーするか
  target_parent_code: z.string().max(10).optional().nullable()
});

/**
 * 分析コード移動スキーマ
 */
export const moveAnalysisCodeSchema = z.object({
  analysis_code: analysisCodeField,
  new_parent_analysis_code: z.string().max(10).optional().nullable(),
  move_children: z.boolean().default(true) // 子ノードも一緒に移動するか
}).refine((data) => {
  // 自己参照チェック
  return data.new_parent_analysis_code !== data.analysis_code;
}, {
  message: "自分自身を親に設定することはできません",
  path: ["new_parent_analysis_code"]
});

/**
 * 分析コードインポートスキーマ（CSVアップロード用）
 */
export const importAnalysisCodeSchema = z.object({
  analysis_codes: z.array(createAnalysisCodeSchema)
    .min(1, "少なくとも1つの分析コードが必要です")
    .max(1000, "一度にインポートできる分析コードは1000件までです")
}).refine((data) => {
  // 重複コードチェック
  const codes = data.analysis_codes.map(code => code.analysis_code);
  const uniqueCodes = new Set(codes);
  return codes.length === uniqueCodes.size;
}, {
  message: "重複する分析コードが含まれています",
  path: ["analysis_codes"]
});

/**
 * 分析コードソートスキーマ
 */
export const analysisCodeSortSchema = z.object({
  sort_field: z.enum([
    "analysis_code", 
    "analysis_name", 
    "analysis_type", 
    "parent_analysis_code",
    "sort_order",
    "created_at",
    "updated_at"
  ]),
  sort_direction: z.enum(["asc", "desc"]).default("asc")
});

/**
 * 分析コード統計スキーマ（レポート用）
 */
export const analysisCodeStatsSchema = z.object({
  analysis_type: z.string().max(50).optional(),
  parent_analysis_code: z.string().max(10).optional().nullable(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  include_inactive: z.boolean().default(false),
  include_usage_count: z.boolean().default(false) // 使用回数を含める
});

/**
 * 分析コード一括更新スキーマ（タイプ変更等）
 */
export const bulkUpdateAnalysisCodeSchema = z.object({
  analysis_codes: z.array(analysisCodeField)
    .min(1, "更新する分析コードを選択してください")
    .max(100, "一度に更新できる分析コードは100件までです"),
  updates: z.object({
    analysis_type: z.string().max(50).optional(),
    is_active: z.boolean().optional(),
    sort_order: sortOrderField.optional()
  }).refine((data) => {
    // 少なくとも1つの更新項目が必要
    return Object.values(data).some(value => value !== undefined);
  }, {
    message: "少なくとも1つの項目を更新してください"
  })
});

/**
 * TypeScript型定義
 */
export type CreateAnalysisCodeInput = z.infer<typeof createAnalysisCodeSchema>;
export type UpdateAnalysisCodeInput = z.infer<typeof updateAnalysisCodeSchema>;
export type AnalysisCodeSearchInput = z.infer<typeof analysisCodeSearchSchema>;
export type AnalysisCodeFilterInput = z.infer<typeof analysisCodeFilterSchema>;
export type AnalysisCodeHierarchyInput = z.infer<typeof analysisCodeHierarchySchema>;
export type DeleteAnalysisCodeInput = z.infer<typeof deleteAnalysisCodeSchema>;
export type CopyAnalysisCodeInput = z.infer<typeof copyAnalysisCodeSchema>;
export type MoveAnalysisCodeInput = z.infer<typeof moveAnalysisCodeSchema>;
export type ImportAnalysisCodeInput = z.infer<typeof importAnalysisCodeSchema>;
export type AnalysisCodeSortInput = z.infer<typeof analysisCodeSortSchema>;
export type AnalysisCodeStatsInput = z.infer<typeof analysisCodeStatsSchema>;
export type BulkUpdateAnalysisCodeInput = z.infer<typeof bulkUpdateAnalysisCodeSchema>;