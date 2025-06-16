"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createRoleSchema, updateRoleSchema } from "@/lib/schemas/master";
import type { Role } from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

// ====================
// ロールマスタのシンプルなServer Actions
// ====================

// Client Component用のロール型
export type RoleForClient = Role & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * ロール一覧の取得（完全camelCase対応）
 */
export async function getRoles(): Promise<
  { success: boolean; data?: RoleForClient[]; error?: string }
> {
  try {
    const roles = await prisma.role.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { roleCode: "asc" }
      ],
    });

    // 日時を日本時間に変換
    const rolesForClient: RoleForClient[] = roles.map((role) => ({
      ...role,
      createdAt: toJST(role.createdAt),
      updatedAt: toJST(role.updatedAt),
    }));

    return { success: true, data: rolesForClient };
  } catch (error) {
    console.error("ロール取得エラー:", error);
    return { success: false, error: "ロールの取得に失敗しました" };
  }
}

/**
 * ロールコードの重複チェック
 */
export async function checkRoleCodeExists(
  roleCode: string,
): Promise<{ exists: boolean; role?: any }> {
  try {
    const existingRole = await prisma.role.findUnique({
      where: { roleCode },
      select: {
        roleCode: true,
        roleName: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingRole,
      role: existingRole || undefined,
    };
  } catch (error) {
    console.error("ロールコード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * ロールの作成
 */
export async function createRole(
  formData: FormData,
): Promise<ActionResult<Role>> {
  const data = {
    roleCode: formData.get("roleCode") as string,
    roleName: formData.get("roleName") as string,
    description: formData.get("description") as string || undefined,
    sortOrder: formData.get("sortOrder")
      ? parseInt(formData.get("sortOrder") as string)
      : undefined,
  };

  try {
    // バリデーション
    const result = createRoleSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // ロールコードの重複チェック
    const { exists } = await checkRoleCodeExists(result.data.roleCode);
    if (exists) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "このロールコードは既に使用されています",
          details: {
            fieldErrors: { roleCode: ["このロールコードは既に使用されています"] },
            retryable: false,
          },
        },
      };
    }

    // データベース登録
    const role = await prisma.role.create({
      data: {
        roleCode: result.data.roleCode,
        roleName: result.data.roleName,
        description: result.data.description || null,
        sortOrder: result.data.sortOrder || null,
        isActive: true,
      },
    });

    revalidatePath("/master/roles");
    return { success: true, data: role };
  } catch (error) {
    return handleServerActionError(error, "ロールの作成", "ロール");
  }
}

/**
 * ロールの更新
 */
export async function updateRole(
  roleCode: string,
  formData: FormData,
): Promise<ActionResult<RoleForClient>> {
  try {
    // FormDataから全フィールドを取得
    const data = {
      roleName: formData.get("roleName") as string,
      description: formData.get("description") as string || undefined,
      isActive: formData.get("isActive") === "true",
      sortOrder: formData.get("sortOrder")
        ? parseInt(formData.get("sortOrder") as string)
        : null,
    };

    // バリデーション（updateSchemaに必要なフィールドのみ）
    const validationData = {
      roleName: data.roleName,
      description: data.description,
      sortOrder: data.sortOrder,
    };

    const result = updateRoleSchema.safeParse(validationData);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // データベース更新（全フィールドを更新）
    const role = await prisma.role.update({
      where: { roleCode },
      data: {
        roleName: data.roleName,
        description: data.description || null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    // RoleForClient型に変換
    const roleForClient: RoleForClient = {
      ...role,
      createdAt: toJST(role.createdAt),
      updatedAt: toJST(role.updatedAt),
    };

    revalidatePath("/master/roles");
    return { success: true, data: roleForClient };
  } catch (error) {
    return handleServerActionError(error, "ロールの更新", "ロール");
  }
}

/**
 * ロールの削除（物理削除）
 */
export async function deleteRole(
  roleCode: string,
): Promise<ActionResult> {
  try {
    // 使用中のロールかチェック（ユーザに紐づいているか）
    const userCount = await prisma.user.count({
      where: { roleCode },
    });

    if (userCount > 0) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "このロールは使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 物理削除
    await prisma.role.delete({
      where: { roleCode },
    });

    revalidatePath("/master/roles");
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "ロールの削除", "ロール");
  }
}

/**
 * ロールの検索（完全camelCase対応）
 */
export async function searchRoles(
  searchTerm: string,
  filters: { isActive?: boolean } = {},
): Promise<{ success: boolean; data?: RoleForClient[]; error?: string }> {
  try {
    const roles = await prisma.role.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { roleCode: { contains: searchTerm, mode: "insensitive" } },
            { roleName: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [
        { sortOrder: "asc" },
        { roleCode: "asc" }
      ],
    });

    // 日時を日本時間に変換
    const rolesForClient: RoleForClient[] = roles.map((role) => ({
      ...role,
      createdAt: toJST(role.createdAt),
      updatedAt: toJST(role.updatedAt),
    }));

    return { success: true, data: rolesForClient };
  } catch (error) {
    console.error("ロール検索エラー:", error);
    return { success: false, error: "ロールの検索に失敗しました" };
  }
}

/**
 * アクティブなロール一覧の取得（選択肢用）
 */
export async function getActiveRoles(): Promise<
  { success: boolean; data?: { roleCode: string; roleName: string }[]; error?: string }
> {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      select: {
        roleCode: true,
        roleName: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { roleCode: "asc" }
      ],
    });

    return { success: true, data: roles };
  } catch (error) {
    console.error("アクティブロール取得エラー:", error);
    return { success: false, error: "アクティブロールの取得に失敗しました" };
  }
}