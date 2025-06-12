/**
 * 税区分タイプ定義
 * ============================================================================
 * 消費税の課税区分を定義する共通タイプ
 * ============================================================================
 */

// 税区分タイプ一覧（将来の拡張に対応）
export const TAX_TYPE_LIST = [
  "taxable",
  "non_taxable", 
  "tax_free",
  "tax_entry"
] as const;

// 税区分タイプ
export type TaxType = typeof TAX_TYPE_LIST[number];

// 税区分選択肢（UI用）
export const TAX_TYPE_OPTIONS = [
  { value: "taxable" as const, label: "課税" },
  { value: "non_taxable" as const, label: "非課税" },
  { value: "tax_free" as const, label: "免税" },
  { value: "tax_entry" as const, label: "税額入力" }
] as const;

// デフォルト税区分
export const DEFAULT_TAX_TYPE: TaxType = "taxable";