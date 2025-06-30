/**
 * Error handler utilities for remote-mcp-server
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: any;
}

export function handleApiError(error: any): ApiResponse {
  console.error("API Error:", error);
  return {
    success: false,
    error: error.message || "Unknown error",
  };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}
