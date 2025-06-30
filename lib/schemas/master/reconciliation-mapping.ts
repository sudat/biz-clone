import { z } from "zod";

/**
 * 勘定照合マスタのZodスキーマ
 */

// 作成用スキーマ
export const createReconciliationMappingSchema = z.object({
  departmentCode: z.string()
    .min(1, "計上部門コードを入力してください")
    .max(10, "計上部門コードは10文字以内で入力してください"),
  
  accountCode: z.string()
    .min(1, "勘定科目コードを入力してください")
    .max(10, "勘定科目コードは10文字以内で入力してください"),
  
  counterDepartmentCode: z.string()
    .min(1, "相手計上部門コードを入力してください")
    .max(10, "相手計上部門コードは10文字以内で入力してください"),
  
  counterAccountCode: z.string()
    .min(1, "相手勘定科目コードを入力してください")
    .max(10, "相手勘定科目コードは10文字以内で入力してください"),
  
  description: z.string().max(500, "説明は500文字以内で入力してください").optional(),
});

// 更新用スキーマ
export const updateReconciliationMappingSchema = createReconciliationMappingSchema.extend({
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

// FormData用のバリデーション（文字列として受け取る場合）
export const reconciliationMappingFormSchema = z.object({
  departmentCode: z.string().min(1, "計上部門コードを選択してください"),
  accountCode: z.string().min(1, "勘定科目コードを選択してください"),
  counterDepartmentCode: z.string().min(1, "相手計上部門コードを選択してください"),
  counterAccountCode: z.string().min(1, "相手勘定科目コードを選択してください"),
  description: z.string().optional(),
  isActive: z.string().optional(),
});

// 検索フィルター用スキーマ
export const reconciliationMappingFilterSchema = z.object({
  departmentCode: z.string().optional(),
  accountCode: z.string().optional(),
  counterDepartmentCode: z.string().optional(),
  counterAccountCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

// 型エクスポート
export type CreateReconciliationMappingInput = z.infer<typeof createReconciliationMappingSchema>;
export type UpdateReconciliationMappingInput = z.infer<typeof updateReconciliationMappingSchema>;
export type ReconciliationMappingFormInput = z.infer<typeof reconciliationMappingFormSchema>;
export type ReconciliationMappingFilter = z.infer<typeof reconciliationMappingFilterSchema>;