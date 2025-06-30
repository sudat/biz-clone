/**
 * Validation utilities for remote-mcp-server (Cloudflare Workers)
 * ============================================================================
 * リクエストバリデーションとハンドラー統合システム
 * ============================================================================
 */

import { z } from "zod";
import {
  type ApiResponse,
  handleApiError,
  successResponse,
} from "./error-handler";

// ====================
// Types
// ====================

export interface AuthContext {
  authenticated: boolean;
  userId?: string;
  scopes?: string[];
}

// ====================
// Auth utilities
// ====================

export function createMockAuth(): AuthContext {
  return {
    authenticated: true,
    userId: "remote-user",
    scopes: ["*"],
  };
}

export function authenticateRequest(auth?: AuthContext): AuthContext {
  return auth || createMockAuth();
}

export function isPublicEndpoint(path: string): boolean {
  const publicPaths = ["test_connection", "check_db_health"];
  return publicPaths.includes(path);
}

export function requireScopes(scopes: string[]): boolean {
  // For remote-mcp-server, always allow
  return true;
}

// ====================
// Validation utilities
// ====================

export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  return schema.parse(data);
}

export type ValidationHandler<TInput extends z.ZodType, TOutput> = (
  input: z.infer<TInput>,
  auth: AuthContext,
) => Promise<TOutput>;

export function withValidation<TInput extends z.ZodType, TOutput>(
  schema: TInput,
  handler: ValidationHandler<TInput, TOutput>,
  requireAuth = true,
) {
  return async (
    input: any,
    auth?: AuthContext,
  ): Promise<ApiResponse<TOutput>> => {
    try {
      const authContext = requireAuth
        ? authenticateRequest(auth)
        : createMockAuth();
      const validatedInput = schema.parse(input);
      const result = await handler(validatedInput, authContext);
      return successResponse(result);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ====================
// Common schemas
// ====================

export const paginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional(),
});

export const searchSchema = paginationSchema.extend({
  searchTerm: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const dateRangeSchema = z.object({
  fromDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "有効な開始日を入力してください",
  }).optional(),
  toDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "有効な終了日を入力してください",
  }).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "IDは必須です"),
});

export const codeParamSchema = z.object({
  code: z.string().min(1, "コードは必須です"),
});
