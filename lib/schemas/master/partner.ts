/**
 * 取引先マスタスキーマ（camelCase統一・簡素化版）
 */

import { z } from "zod";

/**
 * 取引先作成スキーマ
 */
export const createPartnerSchema = z.object({
  partnerCode: z.string().min(1, "取引先コードは必須です").max(15),
  partnerName: z.string().min(1, "取引先名は必須です").max(100),
  partnerKana: z.string().max(100).optional(),
  partnerType: z.enum(["顧客", "仕入先", "銀行", "その他"]),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional().or(z.literal("")),
  address: z.string().max(200).optional()
});

/**
 * 取引先更新スキーマ
 */
export const updatePartnerSchema = z.object({
  partnerName: z.string().min(1, "取引先名は必須です").max(100),
  partnerKana: z.string().max(100).optional(),
  partnerType: z.enum(["顧客", "仕入先", "銀行", "その他"]),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional().or(z.literal("")),
  address: z.string().max(200).optional()
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;