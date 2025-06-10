import { z } from "zod";

/**
 * 補助科目作成スキーマ
 */
export const createSubAccountSchema = z.object({
  subAccountCode: z.string().min(1, "補助科目コードは必須です").max(20),
  accountCode: z.string().min(1, "勘定科目コードは必須です").max(10),
  subAccountName: z.string().min(1, "補助科目名は必須です").max(100),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

/**
 * 補助科目更新スキーマ
 */
export const updateSubAccountSchema = z.object({
  subAccountName: z.string().min(1, "補助科目名は必須です").max(100),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

export type CreateSubAccountInput = z.infer<typeof createSubAccountSchema>;
export type UpdateSubAccountInput = z.infer<typeof updateSubAccountSchema>;