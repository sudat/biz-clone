/**
 * 分析コードマスタスキーマ（camelCase統一・簡素化版）
 */

import { z } from "zod";

/**
 * 分析コード作成スキーマ
 */
export const createAnalysisCodeSchema = z.object({
  analysisCode: z.string().min(1, "分析コードは必須です").max(10),
  analysisName: z.string().min(1, "分析コード名は必須です").max(100),
  analysisType: z.string().min(1, "分析種別は必須です").max(50),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

/**
 * 分析コード更新スキーマ
 */
export const updateAnalysisCodeSchema = z.object({
  analysisName: z.string().min(1, "分析コード名は必須です").max(100),
  analysisType: z.string().min(1, "分析種別は必須です").max(50),
  sortOrder: z.number().int().min(0).max(9999).nullable().optional()
});

export type CreateAnalysisCodeInput = z.infer<typeof createAnalysisCodeSchema>;
export type UpdateAnalysisCodeInput = z.infer<typeof updateAnalysisCodeSchema>;