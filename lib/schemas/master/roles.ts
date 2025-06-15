/**
 * ロールマスタスキーマ（camelCase統一・簡素化版）
 */

import { z } from "zod";

/**
 * ロール作成スキーマ
 */
export const createRoleSchema = z.object({
  roleCode: z.string().min(1, "ロールコードは必須です").max(20),
  roleName: z.string().min(1, "ロール名は必須です").max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

/**
 * ロール更新スキーマ
 */
export const updateRoleSchema = z.object({
  roleName: z.string().min(1, "ロール名は必須です").max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;