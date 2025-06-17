"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { z } from "zod";
import {
  createWorkflowRouteSchema,
  type UpdateRouteStepsInput,
  updateRouteStepsSchema,
  updateWorkflowRouteSchema,
} from "@/lib/schemas/master/workflow-routes";
import type {
  WorkflowOrganization,
  WorkflowRoute,
  WorkflowRouteStep,
} from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

// ====================
// ワークフロールートマスタのServer Actions
// ====================

// Client Component用のワークフロールート型（関連データ含む）
export type WorkflowRouteWithSteps = WorkflowRoute & {
  workflowRouteSteps: (WorkflowRouteStep & {
    workflowOrganization: WorkflowOrganization;
  })[];
};

export type WorkflowRouteForClient = WorkflowRoute;

/**
 * ワークフロールート一覧の取得
 */
export async function getWorkflowRoutes(): Promise<
  { success: boolean; data?: WorkflowRouteForClient[]; error?: string }
> {
  try {
    const routes = await prisma.workflowRoute.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { routeCode: "asc" },
      ],
    });

    // 日時を日本時間に変換
    const routesForClient: WorkflowRouteForClient[] = routes.map((route) => ({
      ...route,
      createdAt: toJST(route.createdAt),
      updatedAt: toJST(route.updatedAt),
    }));

    return { success: true, data: routesForClient };
  } catch (error) {
    console.error("ワークフロールート取得エラー:", error);
    return { success: false, error: "ワークフロールートの取得に失敗しました" };
  }
}

/**
 * ワークフロールートの単一取得
 */
export async function getWorkflowRouteById(
  routeCode: string,
): Promise<
  { success: boolean; data?: WorkflowRouteForClient; error?: string }
> {
  try {
    const route = await prisma.workflowRoute.findUnique({
      where: { routeCode },
    });

    if (!route) {
      return { success: false, error: "ワークフロールートが見つかりません" };
    }

    // 日時を日本時間に変換
    const routeForClient: WorkflowRouteForClient = {
      ...route,
      createdAt: toJST(route.createdAt),
      updatedAt: toJST(route.updatedAt),
    };

    return { success: true, data: routeForClient };
  } catch (error) {
    console.error("ワークフロールート取得エラー:", error);
    return { success: false, error: "ワークフロールートの取得に失敗しました" };
  }
}

/**
 * ワークフロールートの完全な関連データ取得
 */
export async function getRouteWithStepsAndOrganizations(
  routeCode: string,
): Promise<
  { success: boolean; data?: WorkflowRouteWithSteps; error?: string }
> {
  try {
    const route = await prisma.workflowRoute.findUnique({
      where: { routeCode },
      include: {
        workflowRouteSteps: {
          include: {
            workflowOrganization: true,
          },
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    if (!route) {
      return { success: false, error: "ワークフロールートが見つかりません" };
    }

    // 日時を日本時間に変換
    const routeWithSteps: WorkflowRouteWithSteps = {
      ...route,
      createdAt: toJST(route.createdAt),
      updatedAt: toJST(route.updatedAt),
      workflowRouteSteps: route.workflowRouteSteps.map((step) => ({
        ...step,
        createdAt: toJST(step.createdAt),
        updatedAt: toJST(step.updatedAt),
        workflowOrganization: {
          ...step.workflowOrganization,
          createdAt: toJST(step.workflowOrganization.createdAt),
          updatedAt: toJST(step.workflowOrganization.updatedAt),
        },
      })),
    };

    return { success: true, data: routeWithSteps };
  } catch (error) {
    console.error("ワークフロールート詳細取得エラー:", error);
    return { success: false, error: "ワークフロールートの取得に失敗しました" };
  }
}

/**
 * ワークフロールートコードの重複チェック
 */
export async function checkWorkflowRouteCodeExists(
  routeCode: string,
): Promise<{ exists: boolean; route?: any }> {
  try {
    const existingRoute = await prisma.workflowRoute.findUnique({
      where: { routeCode },
      select: {
        routeCode: true,
        routeName: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingRoute,
      route: existingRoute || undefined,
    };
  } catch (error) {
    console.error("ワークフロールートコード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * ワークフロールートの作成
 */
export async function createWorkflowRoute(
  formData: FormData,
): Promise<ActionResult<WorkflowRoute>> {
  try {
    const data = {
      routeCode: formData.get("routeCode") as string,
      routeName: formData.get("routeName") as string,
      description: formData.get("description") as string || undefined,
      flowConfigJson: JSON.parse(
        formData.get("flowConfigJson") as string || '{"nodes":[],"edges":[]}',
      ),
      sortOrder: formData.get("sortOrder")
        ? parseInt(formData.get("sortOrder") as string)
        : undefined,
    };

    // バリデーション
    const result = createWorkflowRouteSchema.safeParse(data);
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
    const route = await prisma.workflowRoute.create({
      data: {
        routeCode: result.data.routeCode,
        routeName: result.data.routeName,
        description: result.data.description,
        flowConfigJson: result.data.flowConfigJson,
        sortOrder: result.data.sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/master/workflow-routes");
    return { success: true, data: route };
  } catch (error) {
    return handleServerActionError(
      error,
      "ワークフロールートの作成",
      "ワークフロールート",
    );
  }
}

/**
 * ワークフロールートの更新
 */
export async function updateWorkflowRoute(
  routeCode: string,
  formData: FormData,
): Promise<ActionResult<WorkflowRouteForClient>> {
  try {
    const data = {
      routeName: formData.get("routeName") as string,
      description: formData.get("description") as string || undefined,
      flowConfigJson: JSON.parse(
        formData.get("flowConfigJson") as string || '{"nodes":[],"edges":[]}',
      ),
      isActive: formData.get("isActive") === "true",
      sortOrder: formData.get("sortOrder")
        ? parseInt(formData.get("sortOrder") as string)
        : undefined,
    };

    // バリデーション（updateSchemaに必要なフィールドのみ）
    const validationData = {
      routeName: data.routeName,
      description: data.description,
      flowConfigJson: data.flowConfigJson,
      sortOrder: data.sortOrder,
    };

    const result = updateWorkflowRouteSchema.safeParse(validationData);
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
    const route = await prisma.workflowRoute.update({
      where: { routeCode },
      data: {
        routeName: data.routeName,
        description: data.description,
        flowConfigJson: data.flowConfigJson,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    // WorkflowRouteForClient型に変換
    const routeForClient: WorkflowRouteForClient = {
      ...route,
      createdAt: toJST(route.createdAt),
      updatedAt: toJST(route.updatedAt),
    };

    revalidatePath("/master/workflow-routes");
    return { success: true, data: routeForClient };
  } catch (error) {
    return handleServerActionError(
      error,
      "ワークフロールートの更新",
      "ワークフロールート",
    );
  }
}

/**
 * フロー設定のみの更新
 */
export async function updateWorkflowRouteFlowConfig(
  routeCode: string,
  flowConfig: any,
): Promise<ActionResult<WorkflowRouteForClient>> {
  try {
    // フロー設定のバリデーション
    const flowConfigSchema = z.object({
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
      viewport: z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number(),
      }).optional(),
    });

    const result = flowConfigSchema.safeParse(flowConfig);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "フロー設定が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // データベース更新
    const route = await prisma.workflowRoute.update({
      where: { routeCode },
      data: {
        flowConfigJson: flowConfig,
      },
    });

    // WorkflowRouteForClient型に変換
    const routeForClient: WorkflowRouteForClient = {
      ...route,
      createdAt: toJST(route.createdAt),
      updatedAt: toJST(route.updatedAt),
    };

    revalidatePath("/master/workflow-routes");
    revalidatePath(`/master/workflow-routes/${routeCode}`);
    return { success: true, data: routeForClient };
  } catch (error) {
    return handleServerActionError(
      error,
      "フロー設定の更新",
      "ワークフロールート",
    );
  }
}

/**
 * ワークフロールートの削除（物理削除）
 */
export async function deleteWorkflowRoute(
  routeCode: string,
): Promise<ActionResult> {
  try {
    // 使用中のルートかチェック（ワークフロールートステップに関連データがあるか）
    const routeStepCount = await prisma.workflowRouteStep.count({
      where: { routeCode },
    });

    if (routeStepCount > 0) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "このワークフロールートは使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // トランザクションで関連データとルートを物理削除
    await prisma.$transaction(async (tx) => {
      // 関連するワークフロールートステップを物理削除（念のため）
      await tx.workflowRouteStep.deleteMany({
        where: { routeCode },
      });

      // ワークフロールートを物理削除
      await tx.workflowRoute.delete({
        where: { routeCode },
      });
    });

    revalidatePath("/master/workflow-routes");
    return { success: true };
  } catch (error) {
    return handleServerActionError(
      error,
      "ワークフロールートの削除",
      "ワークフロールート",
    );
  }
}

/**
 * ルートステップの更新（追加・更新・削除）
 */
export async function updateRouteSteps(
  input: UpdateRouteStepsInput,
): Promise<ActionResult> {
  try {
    // バリデーション
    const result = updateRouteStepsSchema.safeParse(input);
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

    const { routeCode, steps } = result.data;

    // ルートの存在確認
    const existingRoute = await prisma.workflowRoute.findUnique({
      where: { routeCode },
    });

    if (!existingRoute) {
      return {
        success: false,
        error: {
          type: ErrorType.NOT_FOUND,
          message: "ワークフロールートが見つかりません",
          details: { retryable: false },
        },
      };
    }

    // トランザクションでステップを更新
    await prisma.$transaction(async (tx) => {
      // 既存のステップを削除
      await tx.workflowRouteStep.deleteMany({
        where: { routeCode },
      });

      // 新しいステップを追加
      for (const step of steps) {
        await tx.workflowRouteStep.create({
          data: {
            routeCode,
            stepNumber: step.stepNumber,
            organizationCode: step.organizationCode,
            stepName: step.stepName,
            isRequired: step.isRequired,
          },
        });
      }
    });

    revalidatePath("/master/workflow-routes");
    return { success: true };
  } catch (error) {
    return handleServerActionError(
      error,
      "ルートステップの更新",
      "ルートステップ",
    );
  }
}

/**
 * ワークフロールートの検索
 */
export async function searchWorkflowRoutes(
  searchTerm: string,
  filters: { isActive?: boolean } = {},
): Promise<
  { success: boolean; data?: WorkflowRouteForClient[]; error?: string }
> {
  try {
    const routes = await prisma.workflowRoute.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { routeCode: { contains: searchTerm, mode: "insensitive" } },
            { routeName: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [
        { sortOrder: "asc" },
        { routeCode: "asc" },
      ],
    });

    // 日時を日本時間に変換
    const routesForClient: WorkflowRouteForClient[] = routes.map((route) => ({
      ...route,
      createdAt: toJST(route.createdAt),
      updatedAt: toJST(route.updatedAt),
    }));

    return { success: true, data: routesForClient };
  } catch (error) {
    console.error("ワークフロールート検索エラー:", error);
    return { success: false, error: "ワークフロールートの検索に失敗しました" };
  }
}
