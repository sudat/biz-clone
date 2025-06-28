/**
 * 計上部門マスタスキーマ（camelCase統一・簡素化版）
 */

import { z } from "zod";

/**
 * 計上部門作成スキーマ
 */
export const createDepartmentSchema = z.object({
  departmentCode: z.string().min(1, "部門コードは必須です").max(10),
  departmentName: z.string().min(1, "部門名は必須です").max(100),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

/**
 * 計上部門更新スキーマ
 */
export const updateDepartmentSchema = z.object({
  departmentName: z.string().min(1, "部門名は必須です").max(100),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;