/**
 * ユーザマスタスキーマ（camelCase統一・簡素化版）
 */

import { z } from "zod";

/**
 * ユーザ作成スキーマ
 */
export const createUserSchema = z.object({
  userCode: z.string().min(1, "ユーザーコードは必須です").max(20),
  userName: z.string().min(1, "ユーザー名は必須です").max(100),
  userKana: z.string().max(100).optional(),
  email: z.string().email("正しいメールアドレスを入力してください").max(100),
  password: z.string().min(8, "パスワードは8文字以上である必要があります").max(255),
  confirmPassword: z.string().min(8, "確認パスワードは8文字以上である必要があります").max(255),
  roleCode: z.string().min(1, "ロールは必須です").max(20)
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"]
});

/**
 * ユーザ更新スキーマ
 */
export const updateUserSchema = z.object({
  userName: z.string().min(1, "ユーザー名は必須です").max(100),
  userKana: z.string().max(100).optional(),
  email: z.string().email("正しいメールアドレスを入力してください").max(100),
  roleCode: z.string().min(1, "ロールは必須です").max(20)
});

/**
 * パスワード変更スキーマ
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードは必須です"),
  newPassword: z.string().min(8, "新しいパスワードは8文字以上である必要があります").max(255),
  confirmNewPassword: z.string().min(8, "確認パスワードは8文字以上である必要があります").max(255)
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "新しいパスワードが一致しません",
  path: ["confirmNewPassword"]
});

/**
 * ログインスキーマ
 */
export const loginSchema = z.object({
  userCode: z.string().min(1, "ユーザーコードは必須です"),
  password: z.string().min(1, "パスワードは必須です")
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;