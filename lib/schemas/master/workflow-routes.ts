import { z } from "zod";

// ReactFlowのノード・エッジ構造の基本バリデーション
const reactFlowNodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.any().optional(),
});

const reactFlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  data: z.any().optional(),
});

// ReactFlowの設定データのバリデーションスキーマ
const flowConfigSchema = z.object({
  nodes: z.array(reactFlowNodeSchema),
  edges: z.array(reactFlowEdgeSchema),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }).optional(),
});

// ワークフロールートマスタ作成時のバリデーションスキーマ
export const createWorkflowRouteSchema = z.object({
  routeCode: z
    .string()
    .min(1, "ルートコードは必須です")
    .max(20, "ルートコードは20文字以内で入力してください")
    .regex(/^[A-Za-z0-9_-]+$/, "ルートコードは英数字、ハイフン、アンダースコアのみ使用できます"),
  routeName: z
    .string()
    .min(1, "ルート名は必須です")
    .max(100, "ルート名は100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  flowConfigJson: flowConfigSchema,
  sortOrder: z
    .number()
    .int("表示順は整数で入力してください")
    .min(0, "表示順は0以上で入力してください")
    .max(999999, "表示順は999999以下で入力してください")
    .optional(),
});

// ワークフロールートマスタ更新時のバリデーションスキーマ（コードは更新不可）
export const updateWorkflowRouteSchema = z.object({
  routeName: z
    .string()
    .min(1, "ルート名は必須です")
    .max(100, "ルート名は100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  flowConfigJson: flowConfigSchema,
  sortOrder: z
    .number()
    .int("表示順は整数で入力してください")
    .min(0, "表示順は0以上で入力してください")
    .max(999999, "表示順は999999以下で入力してください")
    .optional(),
});

// ルートステップ管理のバリデーションスキーマ
export const routeStepSchema = z.object({
  stepNumber: z
    .number()
    .int("ステップ番号は整数で入力してください")
    .min(1, "ステップ番号は1以上で入力してください")
    .max(999, "ステップ番号は999以下で入力してください"),
  organizationCode: z
    .string()
    .min(1, "組織コードは必須です")
    .max(20, "組織コードは20文字以内で入力してください"),
  stepName: z
    .string()
    .max(100, "ステップ名は100文字以内で入力してください")
    .optional(),
  isRequired: z
    .boolean()
    .default(true),
});

export const updateRouteStepsSchema = z.object({
  routeCode: z
    .string()
    .min(1, "ルートコードは必須です"),
  steps: z
    .array(routeStepSchema)
    .min(1, "少なくとも1つのステップが必要です")
    .max(100, "ステップは100個まで登録できます"),
});

// 型定義のエクスポート
export type CreateWorkflowRouteInput = z.infer<typeof createWorkflowRouteSchema>;
export type UpdateWorkflowRouteInput = z.infer<typeof updateWorkflowRouteSchema>;
export type RouteStepInput = z.infer<typeof routeStepSchema>;
export type UpdateRouteStepsInput = z.infer<typeof updateRouteStepsSchema>;