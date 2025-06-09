/**
 * 取引先マスタスキーマ
 * ============================================================================
 * 取引先の作成・更新・検索に関するバリデーションスキーマ
 * 
 * 主要機能:
 * 1. 取引先の新規作成・更新フォーム用スキーマ
 * 2. 取引先種別による制約チェック
 * 3. 連絡先情報のバリデーション
 * 4. 検索フィルター用スキーマ
 * ============================================================================
 */

import { z } from "zod";
import { 
  partnerCodeField, 
  createNameField, 
  createKanaField,
  createEmailField,
  phoneField,
  postalCodeField,
  addressField,
  contactPersonField,
  sortOrderField,
  isActiveField,
  createMemoField
} from "../common/base-fields";
import { partnerTypeField } from "../common/validation-rules";

/**
 * 取引先作成スキーマ
 */
export const createPartnerSchema = z.object({
  partner_code: partnerCodeField,
  partner_name: createNameField("取引先", 100),
  partner_name_kana: createKanaField("取引先", 100),
  partner_type: partnerTypeField,
  postal_code: postalCodeField,
  address: addressField,
  phone: phoneField,
  email: createEmailField(false),
  contact_person: contactPersonField,
  sort_order: sortOrderField,
  is_active: isActiveField,
  notes: createMemoField("備考", 500)
});

/**
 * 取引先更新スキーマ
 */
export const updatePartnerSchema = createPartnerSchema.partial().extend({
  partner_code: partnerCodeField // コードは必須のまま
});

/**
 * 取引先検索スキーマ
 */
export const partnerSearchSchema = z.object({
  partner_code: z.string().max(15).optional(),
  partner_name: z.string().max(100).optional(),
  partner_type: partnerTypeField.optional(),
  postal_code: z.string().max(8).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional().or(z.literal("")),
  contact_person: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional() // 横断検索用
});

/**
 * 取引先一覧フィルタースキーマ
 */
export const partnerFilterSchema = z.object({
  partner_type: partnerTypeField.optional(),
  is_active: z.boolean().optional(),
  has_email: z.boolean().optional(), // メールアドレス有無
  has_phone: z.boolean().optional(), // 電話番号有無
  search: z.string().max(100).optional()
});

/**
 * 取引先削除検証スキーマ
 */
export const deletePartnerSchema = z.object({
  partner_code: partnerCodeField
});

/**
 * 取引先コピースキーマ
 */
export const copyPartnerSchema = z.object({
  source_partner_code: partnerCodeField,
  new_partner_code: partnerCodeField,
  new_partner_name: createNameField("取引先", 100),
  copy_contact_info: z.boolean().default(true)
});

/**
 * 取引先マージスキーマ（重複データ統合用）
 */
export const mergePartnersSchema = z.object({
  primary_partner_code: partnerCodeField,
  secondary_partner_codes: z.array(partnerCodeField)
    .min(1, "統合する取引先を選択してください")
    .max(10, "一度に統合できる取引先は10件までです"),
  merge_strategy: z.enum([
    "keep_primary", // 主取引先の情報を保持
    "merge_contact", // 連絡先情報を統合
    "custom" // カスタム統合
  ]).default("keep_primary")
}).refine((data) => {
  // 主取引先が統合対象に含まれていないかチェック
  return !data.secondary_partner_codes.includes(data.primary_partner_code);
}, {
  message: "主取引先は統合対象に含めることはできません",
  path: ["secondary_partner_codes"]
});

/**
 * 取引先インポートスキーマ（CSVアップロード用）
 */
export const importPartnerSchema = z.object({
  partners: z.array(createPartnerSchema)
    .min(1, "少なくとも1つの取引先が必要です")
    .max(1000, "一度にインポートできる取引先は1000件までです")
}).refine((data) => {
  // 重複コードチェック
  const codes = data.partners.map(partner => partner.partner_code);
  const uniqueCodes = new Set(codes);
  return codes.length === uniqueCodes.size;
}, {
  message: "重複する取引先コードが含まれています",
  path: ["partners"]
});

/**
 * 取引先ソートスキーマ
 */
export const partnerSortSchema = z.object({
  sort_field: z.enum([
    "partner_code", 
    "partner_name", 
    "partner_type", 
    "postal_code",
    "sort_order",
    "created_at",
    "updated_at"
  ]),
  sort_direction: z.enum(["asc", "desc"]).default("asc")
});

/**
 * 取引先統計スキーマ（レポート用）
 */
export const partnerStatsSchema = z.object({
  partner_type: partnerTypeField.optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  include_inactive: z.boolean().default(false),
  group_by: z.enum(["partner_type", "postal_code_prefix", "creation_month"]).optional()
});

/**
 * 取引先連絡先更新スキーマ（連絡先情報のみ更新）
 */
export const updatePartnerContactSchema = z.object({
  partner_code: partnerCodeField,
  postal_code: postalCodeField,
  address: addressField,
  phone: phoneField,
  email: createEmailField(false),
  contact_person: contactPersonField
});

/**
 * TypeScript型定義
 */
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type PartnerSearchInput = z.infer<typeof partnerSearchSchema>;
export type PartnerFilterInput = z.infer<typeof partnerFilterSchema>;
export type DeletePartnerInput = z.infer<typeof deletePartnerSchema>;
export type CopyPartnerInput = z.infer<typeof copyPartnerSchema>;
export type MergePartnersInput = z.infer<typeof mergePartnersSchema>;
export type ImportPartnerInput = z.infer<typeof importPartnerSchema>;
export type PartnerSortInput = z.infer<typeof partnerSortSchema>;
export type PartnerStatsInput = z.infer<typeof partnerStatsSchema>;
export type UpdatePartnerContactInput = z.infer<typeof updatePartnerContactSchema>;