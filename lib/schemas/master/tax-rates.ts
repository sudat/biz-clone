/**
 * 税率マスタスキーマ（Decimal型対応・camelCase統一版）
 */

import { z } from "zod";

/**
 * 税率作成スキーマ
 */
export const createTaxRateSchema = z.object({
  taxCode: z.string().min(1, "税区分コードは必須です").max(20),
  taxName: z.string().min(1, "税区分名は必須です").max(100),
  taxRate: z.number().min(0, "税率は0以上で入力してください").max(100, "税率は100以下で入力してください"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

/**
 * 税率更新スキーマ
 */
export const updateTaxRateSchema = z.object({
  taxName: z.string().min(1, "税区分名は必須です").max(100),
  taxRate: z.number().min(0, "税率は0以上で入力してください").max(100, "税率は100以下で入力してください"),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;