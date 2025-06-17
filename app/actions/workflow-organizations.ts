"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import {
  assignUsersToOrganizationSchema,
  createWorkflowOrganizationSchema,
  removeUsersFromOrganizationSchema,
  updateWorkflowOrganizationSchema,
} from "@/lib/schemas/master/workflow-organizations";
import type { WorkflowOrganization } from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

// ====================
// ワークフロー組織マスタのServer Actions
// ====================

// Client Component用のワークフロー組織型
export type WorkflowOrganizationForClient = WorkflowOrganization & {
  createdAt: Date;
  updatedAt: Date;
  userCount?: number; // 所属ユーザ数
  users?: Array<{
    userId: string;
    userCode: string;
    userName: string;
    email: string;
  }>;
};

/**
 * ワークフロー組織一覧の取得
 */
export async function getWorkflowOrganizations(): Promise<
  { success: boolean; data?: WorkflowOrganizationForClient[]; error?: string }
> {
  try {
    const organizations = await prisma.workflowOrganization.findMany({
      include: {
        workflowOrganizationUsers: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                userId: true,
                userCode: true,
                userName: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [
        { sortOrder: "asc" },
        { organizationCode: "asc" },
      ],
    });

    // 日時を日本時間に変換し、ユーザ情報を追加
    const organizationsForClient: WorkflowOrganizationForClient[] =
      organizations.map((org) => ({
        ...org,
        createdAt: toJST(org.createdAt),
        updatedAt: toJST(org.updatedAt),
        userCount: org.workflowOrganizationUsers.filter((wu) =>
          wu.user.isActive
        ).length,
        users: org.workflowOrganizationUsers
          .filter((wu) => wu.user.isActive)
          .map((wu) => ({
            userId: wu.user.userId,
            userCode: wu.user.userCode,
            userName: wu.user.userName,
            email: wu.user.email,
          })),
      }));

    return { success: true, data: organizationsForClient };
  } catch (error) {
    console.error("ワークフロー組織取得エラー:", error);
    return { success: false, error: "ワークフロー組織の取得に失敗しました" };
  }
}

/**
 * 組織コードによるワークフロー組織取得
 */
export async function getWorkflowOrganizationById(
  organizationCode: string,
): Promise<
  { success: boolean; data?: WorkflowOrganizationForClient; error?: string }
> {
  try {
    const organization = await prisma.workflowOrganization.findUnique({
      where: { organizationCode },
      include: {
        workflowOrganizationUsers: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                userId: true,
                userCode: true,
                userName: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      return {
        success: false,
        error: "指定されたワークフロー組織が見つかりません",
      };
    }

    const organizationForClient: WorkflowOrganizationForClient = {
      ...organization,
      createdAt: toJST(organization.createdAt),
      updatedAt: toJST(organization.updatedAt),
      userCount: organization.workflowOrganizationUsers.filter((wu) =>
        wu.user.isActive
      ).length,
      users: organization.workflowOrganizationUsers
        .filter((wu) => wu.user.isActive)
        .map((wu) => ({
          userId: wu.user.userId,
          userCode: wu.user.userCode,
          userName: wu.user.userName,
          email: wu.user.email,
        })),
    };

    return { success: true, data: organizationForClient };
  } catch (error) {
    console.error("ワークフロー組織取得エラー:", error);
    return { success: false, error: "ワークフロー組織の取得に失敗しました" };
  }
}

/**
 * 組織コードの重複チェック
 */
export async function checkOrganizationCodeExists(
  organizationCode: string,
): Promise<{ exists: boolean; organization?: any }> {
  try {
    const existingOrganization = await prisma.workflowOrganization.findUnique({
      where: { organizationCode },
      select: {
        organizationCode: true,
        organizationName: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingOrganization,
      organization: existingOrganization || undefined,
    };
  } catch (error) {
    console.error("組織コード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * ワークフロー組織の作成
 */
export async function createWorkflowOrganization(
  formData: FormData,
): Promise<ActionResult<WorkflowOrganization>> {
  const data = {
    organizationCode: formData.get("organizationCode") as string,
    organizationName: formData.get("organizationName") as string,
    description: formData.get("description") as string || undefined,
    sortOrder: formData.get("sortOrder")
      ? parseInt(formData.get("sortOrder") as string)
      : undefined,
  };

  try {
    // バリデーション
    const result = createWorkflowOrganizationSchema.safeParse(data);
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

    // 組織コードの重複チェック
    const { exists } = await checkOrganizationCodeExists(
      result.data.organizationCode,
    );
    if (exists) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "この組織コードは既に使用されています",
          details: {
            fieldErrors: {
              organizationCode: ["この組織コードは既に使用されています"],
            },
            retryable: false,
          },
        },
      };
    }

    // データベース登録
    const organization = await prisma.workflowOrganization.create({
      data: {
        organizationCode: result.data.organizationCode,
        organizationName: result.data.organizationName,
        description: result.data.description || null,
        sortOrder: result.data.sortOrder || null,
        isActive: true,
      },
    });

    revalidatePath("/master/workflow-organizations");
    return { success: true, data: organization };
  } catch (error) {
    return handleServerActionError(
      error,
      "ワークフロー組織の作成",
      "ワークフロー組織",
    );
  }
}

/**
 * ワークフロー組織の更新
 */
export async function updateWorkflowOrganization(
  organizationCode: string,
  formData: FormData,
): Promise<ActionResult<WorkflowOrganizationForClient>> {
  try {
    // FormDataから全フィールドを取得
    const data = {
      organizationName: formData.get("organizationName") as string,
      description: formData.get("description") as string || undefined,
      isActive: formData.get("isActive") === "true",
      sortOrder: formData.get("sortOrder")
        ? parseInt(formData.get("sortOrder") as string)
        : null,
    };

    // バリデーション（updateSchemaに必要なフィールドのみ）
    const validationData = {
      organizationName: data.organizationName,
      description: data.description,
      sortOrder: data.sortOrder,
    };

    const result = updateWorkflowOrganizationSchema.safeParse(validationData);
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

    // データベース更新
    const organization = await prisma.workflowOrganization.update({
      where: { organizationCode },
      data: {
        organizationName: data.organizationName,
        description: data.description || null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    // WorkflowOrganizationForClient型に変換
    const organizationForClient: WorkflowOrganizationForClient = {
      ...organization,
      createdAt: toJST(organization.createdAt),
      updatedAt: toJST(organization.updatedAt),
    };

    revalidatePath("/master/workflow-organizations");
    return { success: true, data: organizationForClient };
  } catch (error) {
    return handleServerActionError(
      error,
      "ワークフロー組織の更新",
      "ワークフロー組織",
    );
  }
}

/**
 * ワークフロー組織の削除（物理削除）
 */
export async function deleteWorkflowOrganization(
  organizationCode: string,
): Promise<ActionResult> {
  try {
    // 使用中の組織かチェック（ワークフロールートステップに紐づいているか）
    const routeStepCount = await prisma.workflowRouteStep.count({
      where: { organizationCode },
    });

    if (routeStepCount > 0) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "このワークフロー組織は使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // トランザクションで関連データと組織を物理削除
    await prisma.$transaction(async (tx) => {
      // 関連する組織ユーザ関連付けを物理削除
      await tx.workflowOrganizationUser.deleteMany({
        where: { organizationCode },
      });

      // 組織を物理削除
      await tx.workflowOrganization.delete({
        where: { organizationCode },
      });
    });

    revalidatePath("/master/workflow-organizations");
    return { success: true };
  } catch (error) {
    return handleServerActionError(
      error,
      "ワークフロー組織の削除",
      "ワークフロー組織",
    );
  }
}

/**
 * ユーザの組織への関連付け
 */
export async function assignUsersToOrganization(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const organizationCode = formData.get("organizationCode") as string;
    const userIdsStr = formData.get("userIds") as string;
    const userIds = userIdsStr ? userIdsStr.split(",") : [];

    const data = {
      organizationCode,
      userIds,
    };

    // バリデーション
    const result = assignUsersToOrganizationSchema.safeParse(data);
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

    // 組織の存在チェック
    const organization = await prisma.workflowOrganization.findUnique({
      where: { organizationCode: result.data.organizationCode, isActive: true },
    });

    if (!organization) {
      return {
        success: false,
        error: {
          type: ErrorType.NOT_FOUND,
          message: "指定された組織が見つかりません",
          details: { retryable: false },
        },
      };
    }

    // ユーザの存在チェック
    const users = await prisma.user.findMany({
      where: {
        userId: { in: result.data.userIds },
        isActive: true,
      },
    });

    if (users.length !== result.data.userIds.length) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "指定されたユーザの中に無効なユーザが含まれています",
          details: { retryable: false },
        },
      };
    }

    // トランザクションで処理
    await prisma.$transaction(async (tx) => {
      for (const userId of result.data.userIds) {
        await tx.workflowOrganizationUser.upsert({
          where: {
            organizationCode_userId: {
              organizationCode: result.data.organizationCode,
              userId,
            },
          },
          update: {
            isActive: true,
          },
          create: {
            organizationCode: result.data.organizationCode,
            userId,
            isActive: true,
          },
        });
      }
    });

    revalidatePath("/master/workflow-organizations");
    return { success: true };
  } catch (error) {
    return handleServerActionError(
      error,
      "ユーザの組織への関連付け",
      "ユーザ関連付け",
    );
  }
}

/**
 * ユーザの組織からの関連付け解除
 */
export async function removeUsersFromOrganization(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const organizationCode = formData.get("organizationCode") as string;
    const userIdsStr = formData.get("userIds") as string;
    const userIds = userIdsStr ? userIdsStr.split(",") : [];

    const data = {
      organizationCode,
      userIds,
    };

    // バリデーション
    const result = removeUsersFromOrganizationSchema.safeParse(data);
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

    // 関連付けを無効化
    await prisma.workflowOrganizationUser.updateMany({
      where: {
        organizationCode: result.data.organizationCode,
        userId: { in: result.data.userIds },
      },
      data: { isActive: false },
    });

    revalidatePath("/master/workflow-organizations");
    return { success: true };
  } catch (error) {
    return handleServerActionError(
      error,
      "ユーザの組織からの関連付け解除",
      "ユーザ関連付け解除",
    );
  }
}

/**
 * ワークフロー組織の検索
 */
export async function searchWorkflowOrganizations(
  searchTerm: string,
  filters: {
    isActive?: boolean;
    hasUsers?: "withUsers" | "withoutUsers";
    hasDescription?: "withDescription" | "withoutDescription";
  } = {},
): Promise<
  { success: boolean; data?: WorkflowOrganizationForClient[]; error?: string }
> {
  try {
    const organizations = await prisma.workflowOrganization.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { organizationCode: { contains: searchTerm, mode: "insensitive" } },
            { organizationName: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
        // 説明の有無でフィルタ
        ...(filters.hasDescription === "withDescription" && {
          description: { not: { equals: "" } },
          NOT: { description: null },
        }),
        ...(filters.hasDescription === "withoutDescription" && {
          OR: [
            { description: null },
            { description: { equals: "" } },
          ],
        }),
      },
      include: {
        workflowOrganizationUsers: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                userId: true,
                userCode: true,
                userName: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [
        { sortOrder: "asc" },
        { organizationCode: "asc" },
      ],
    });

    // 日時を日本時間に変換
    let organizationsForClient: WorkflowOrganizationForClient[] = organizations
      .map((org) => ({
        ...org,
        createdAt: toJST(org.createdAt),
        updatedAt: toJST(org.updatedAt),
        userCount: org.workflowOrganizationUsers.filter((wu) =>
          wu.user.isActive
        ).length,
        users: org.workflowOrganizationUsers
          .filter((wu) => wu.user.isActive)
          .map((wu) => ({
            userId: wu.user.userId,
            userCode: wu.user.userCode,
            userName: wu.user.userName,
            email: wu.user.email,
          })),
      }));

    // 所属ユーザーの有無でフィルタ（Prismaクエリでは複雑なため、後処理）
    if (filters.hasUsers === "withUsers") {
      organizationsForClient = organizationsForClient.filter((org) =>
        (org.userCount || 0) > 0
      );
    } else if (filters.hasUsers === "withoutUsers") {
      organizationsForClient = organizationsForClient.filter((org) =>
        (org.userCount || 0) === 0
      );
    }

    return { success: true, data: organizationsForClient };
  } catch (error) {
    console.error("ワークフロー組織検索エラー:", error);
    return { success: false, error: "ワークフロー組織の検索に失敗しました" };
  }
}

/**
 * アクティブなワークフロー組織一覧の取得（選択肢用）
 */
export async function getActiveWorkflowOrganizations(): Promise<
  {
    success: boolean;
    data?: { organizationCode: string; organizationName: string }[];
    error?: string;
  }
> {
  try {
    const organizations = await prisma.workflowOrganization.findMany({
      where: { isActive: true },
      select: {
        organizationCode: true,
        organizationName: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { organizationCode: "asc" },
      ],
    });

    return { success: true, data: organizations };
  } catch (error) {
    console.error("アクティブワークフロー組織取得エラー:", error);
    return {
      success: false,
      error: "アクティブワークフロー組織の取得に失敗しました",
    };
  }
}
