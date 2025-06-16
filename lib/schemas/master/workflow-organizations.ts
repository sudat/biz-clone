import { z } from "zod";

// ワークフロー組織マスタ作成時のバリデーションスキーマ
export const createWorkflowOrganizationSchema = z.object({
  organizationCode: z
    .string()
    .min(1, "組織コードは必須です")
    .max(20, "組織コードは20文字以内で入力してください")
    .regex(/^[A-Za-z0-9_-]+$/, "組織コードは英数字、ハイフン、アンダースコアのみ使用できます"),
  organizationName: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  sortOrder: z
    .number()
    .int("表示順は整数で入力してください")
    .min(0, "表示順は0以上で入力してください")
    .max(999999, "表示順は999999以下で入力してください")
    .optional(),
});

// ワークフロー組織マスタ更新時のバリデーションスキーマ（コードは更新不可）
export const updateWorkflowOrganizationSchema = z.object({
  organizationName: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  sortOrder: z
    .number()
    .int("表示順は整数で入力してください")
    .min(0, "表示順は0以上で入力してください")
    .max(999999, "表示順は999999以下で入力してください")
    .optional(),
});

// 組織・ユーザ関連付けのバリデーションスキーマ
export const assignUsersToOrganizationSchema = z.object({
  organizationCode: z
    .string()
    .min(1, "組織コードは必須です"),
  userIds: z
    .array(z.string().uuid("有効なユーザIDを指定してください"))
    .min(1, "少なくとも1人のユーザを選択してください"),
});

// 組織・ユーザ関連付け解除のバリデーションスキーマ
export const removeUsersFromOrganizationSchema = z.object({
  organizationCode: z
    .string()
    .min(1, "組織コードは必須です"),
  userIds: z
    .array(z.string().uuid("有効なユーザIDを指定してください"))
    .min(1, "少なくとも1人のユーザを選択してください"),
});

// 型定義のエクスポート
export type CreateWorkflowOrganizationInput = z.infer<typeof createWorkflowOrganizationSchema>;
export type UpdateWorkflowOrganizationInput = z.infer<typeof updateWorkflowOrganizationSchema>;
export type AssignUsersToOrganizationInput = z.infer<typeof assignUsersToOrganizationSchema>;
export type RemoveUsersFromOrganizationInput = z.infer<typeof removeUsersFromOrganizationSchema>;