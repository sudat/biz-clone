/**
 * 勘定科目マスタスキーマ（camelCase統一・簡素化版）
 */

import { z } from "zod";
import { ACCOUNT_TYPE_LIST, type AccountType } from "@/types/master-types";

/**
 * 勘定科目作成スキーマ
 */
export const createAccountSchema = z.object({
  accountCode: z.string().min(1, "勘定科目コードは必須です").max(10),
  accountName: z.string().min(1, "勘定科目名は必須です").max(100),
  accountType: z.enum(ACCOUNT_TYPE_LIST),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

/**
 * 勘定科目更新スキーマ
 */
export const updateAccountSchema = z.object({
  accountName: z.string().min(1, "勘定科目名は必須です").max(100),
  accountType: z.enum(ACCOUNT_TYPE_LIST),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;