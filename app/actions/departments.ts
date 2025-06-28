"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createDepartmentSchema, updateDepartmentSchema } from "@/lib/schemas/master/department";
import type { Department } from "@prisma/client";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

// ====================
// 計上部門のシンプルなServer Actions
// ====================

// Client Component用の計上部門型
export type DepartmentForClient = Department;

/**
 * 計上部門一覧の取得（完全camelCase対応）
 */
export async function getDepartments(): Promise<
  { success: boolean; data?: DepartmentForClient[]; error?: string }
> {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { departmentCode: "asc" },
    });

    // 日時を日本時間に変換
    const departmentsForClient: DepartmentForClient[] = departments.map((department) => ({
      ...department,
      createdAt: toJST(department.createdAt),
      updatedAt: toJST(department.updatedAt),
    }));

    return { success: true, data: departmentsForClient };
  } catch (error) {
    console.error("計上部門取得エラー:", error);
    return { success: false, error: "計上部門の取得に失敗しました" };
  }
}

/**
 * 計上部門コードの重複チェック
 */
export async function checkDepartmentCodeExists(
  departmentCode: string,
): Promise<{ exists: boolean; department?: Partial<Department> }> {
  try {
    const existingDepartment = await prisma.department.findUnique({
      where: { departmentCode },
      select: {
        departmentCode: true,
        departmentName: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingDepartment,
      department: existingDepartment || undefined,
    };
  } catch (error) {
    console.error("計上部門コード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * 計上部門の作成
 */
export async function createDepartment(
  formData: FormData,
): Promise<ActionResult<Department>> {
  const data = {
    departmentCode: formData.get("departmentCode") as string,
    departmentName: formData.get("departmentName") as string,
    sortOrder: formData.get("sortOrder") 
      ? parseInt(formData.get("sortOrder") as string) 
      : null,
  };

  try {
    // バリデーション
    const result = createDepartmentSchema.safeParse(data);
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

    // データベース登録
    const department = await prisma.department.create({
      data: {
        departmentCode: result.data.departmentCode,
        departmentName: result.data.departmentName,
        sortOrder: result.data.sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/master/departments");
    return { success: true, data: department };
  } catch (error) {
    return handleServerActionError(error, "計上部門の作成", "計上部門");
  }
}

/**
 * 計上部門の更新
 */
export async function updateDepartment(
  departmentCode: string,
  formData: FormData,
): Promise<ActionResult<DepartmentForClient>> {
  try {
    // FormDataから全フィールドを取得
    const data = {
      departmentName: formData.get("departmentName") as string,
      isActive: formData.get("isActive") === "true",
      sortOrder: formData.get("sortOrder")
        ? parseInt(formData.get("sortOrder") as string)
        : null,
    };

    // バリデーション（updateSchemaに必要なフィールドのみ）
    const validationData = {
      departmentName: data.departmentName,
      sortOrder: data.sortOrder,
    };

    const result = updateDepartmentSchema.safeParse(validationData);
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
    const department = await prisma.department.update({
      where: { departmentCode },
      data: {
        departmentName: data.departmentName,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    revalidatePath("/master/departments");
    return { success: true, data: department };
  } catch (error) {
    return handleServerActionError(error, "計上部門の更新", "計上部門");
  }
}

/**
 * 計上部門の削除
 */
export async function deleteDepartment(
  departmentCode: string,
): Promise<ActionResult> {
  try {
    // 削除前に関連データの存在チェック
    const journalDetailCount = await prisma.journalDetail.count({
      where: { departmentCode },
    });

    // 関連データが存在する場合は削除を拒否
    if (journalDetailCount > 0) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "この計上部門は使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 物理削除を実行
    await prisma.department.delete({
      where: { departmentCode },
    });

    revalidatePath("/master/departments");
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "計上部門の削除", "計上部門");
  }
}

/**
 * 計上部門の検索（完全camelCase対応）
 */
export async function searchDepartments(
  searchTerm: string,
  filters: { isActive?: boolean } = {},
): Promise<{ success: boolean; data?: DepartmentForClient[]; error?: string }> {
  try {
    const departments = await prisma.department.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { departmentCode: { contains: searchTerm, mode: "insensitive" } },
            { departmentName: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { departmentCode: "asc" },
    });

    // 日時を日本時間に変換
    const departmentsForClient: DepartmentForClient[] = departments.map((department) => ({
      ...department,
      createdAt: toJST(department.createdAt),
      updatedAt: toJST(department.updatedAt),
    }));

    return { success: true, data: departmentsForClient };
  } catch (error) {
    console.error("計上部門検索エラー:", error);
    return { success: false, error: "計上部門の検索に失敗しました" };
  }
}