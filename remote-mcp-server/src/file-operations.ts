/**
 * File Operations for Remote MCP Server
 * ============================================================================
 * Cloudflare Workers環境でのファイル操作機能
 * - ファイルアップロード（UploadThing互換）
 * - ファイル削除（添付ファイル削除）
 * - ファイルダウンロード（添付ファイル取得）
 * ============================================================================
 */

import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

// Zod Schemas for validation
export const UploadFileSchema = z.object({
  journalNumber: z.string().describe("Journal number to attach file to"),
  fileData: z.string().describe("Base64 encoded file data"),
  fileName: z.string().describe("Original file name"),
  mimeType: z.string().describe("MIME type of the file"),
  fileSize: z.number().describe("File size in bytes"),
});

export const DeleteAttachmentSchema = z.object({
  attachmentId: z.string().uuid().describe("UUID of the attachment to delete"),
});

export const DownloadAttachmentSchema = z.object({
  attachmentId: z.string().uuid().describe("UUID of the attachment to download"),
});

// Type definitions
export type UploadFileInput = z.infer<typeof UploadFileSchema>;
export type DeleteAttachmentInput = z.infer<typeof DeleteAttachmentSchema>;
export type DownloadAttachmentInput = z.infer<typeof DownloadAttachmentSchema>;

// Environment interface for Cloudflare Workers
interface Env {
  UPLOADTHING_SECRET?: string;
  UPLOADTHING_APP_ID?: string;
  R2_BUCKET?: R2Bucket; // Optional R2 bucket for file storage
}

/**
 * File upload handler
 * Cloudflare Workers環境でのファイルアップロード処理
 */
export async function uploadFile(
  prisma: PrismaClient,
  env: Env,
  input: UploadFileInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { journalNumber, fileData, fileName, mimeType, fileSize } = input;

    // Validate journal exists
    const journal = await prisma.journalHeader.findUnique({
      where: { journalNumber },
    });

    if (!journal) {
      return {
        success: false,
        error: "指定された仕訳番号が見つかりません",
      };
    }

    // Validate file size (max 8MB)
    if (fileSize > 8 * 1024 * 1024) {
      return {
        success: false,
        error: "ファイルサイズが8MBを超えています",
      };
    }

    // Validate MIME type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return {
        success: false,
        error: "サポートされていないファイル形式です",
      };
    }

    // Generate unique attachment ID
    const attachmentId = uuidv4();
    
    // Extract file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Generate unique file name
    const uniqueFileName = `${attachmentId}.${fileExtension}`;

    // For Cloudflare Workers, we'll store the file in R2 or use a mock URL
    let fileUrl: string;
    
    if (env.R2_BUCKET) {
      // Store in R2 bucket
      const fileBuffer = Buffer.from(fileData, 'base64');
      await env.R2_BUCKET.put(uniqueFileName, fileBuffer, {
        httpMetadata: {
          contentType: mimeType,
        },
      });
      fileUrl = `https://your-r2-domain.com/${uniqueFileName}`;
    } else {
      // Mock URL for development/testing
      fileUrl = `https://mock-upload-service.com/files/${uniqueFileName}`;
    }

    // Save attachment info to database
    const attachment = await prisma.journalAttachment.create({
      data: {
        attachmentId,
        journalNumber,
        fileName: uniqueFileName,
        originalFileName: fileName,
        fileUrl,
        fileSize: BigInt(fileSize),
        fileExtension,
        mimeType,
      },
    });

    return {
      success: true,
      data: {
        attachmentId: attachment.attachmentId,
        fileName: attachment.fileName,
        originalFileName: attachment.originalFileName,
        fileUrl: attachment.fileUrl,
        message: "ファイルがアップロードされました",
      },
    };

  } catch (error) {
    console.error("File upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ファイルアップロードに失敗しました",
    };
  }
}

/**
 * File deletion handler
 * 添付ファイルの削除処理
 */
export async function deleteAttachment(
  prisma: PrismaClient,
  env: Env,
  input: DeleteAttachmentInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { attachmentId } = input;

    // Get attachment info
    const attachment = await prisma.journalAttachment.findUnique({
      where: { attachmentId },
      include: {
        journalHeader: {
          select: {
            journalNumber: true,
            approvalStatus: true,
          },
        },
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: "指定されたファイルが見つかりません",
      };
    }

    // Security check: Don't allow deletion of approved journal attachments
    if (attachment.journalHeader.approvalStatus === "approved") {
      return {
        success: false,
        error: "承認済みの仕訳の添付ファイルは削除できません",
      };
    }

    // Delete from R2 bucket if available
    if (env.R2_BUCKET) {
      try {
        await env.R2_BUCKET.delete(attachment.fileName);
      } catch (r2Error) {
        console.warn("R2 deletion failed:", r2Error);
        // Continue with database deletion even if R2 deletion fails
      }
    }

    // Delete from database
    await prisma.journalAttachment.delete({
      where: { attachmentId },
    });

    return {
      success: true,
      data: {
        attachmentId: attachment.attachmentId,
        originalFileName: attachment.originalFileName,
        message: "ファイルが削除されました",
      },
    };

  } catch (error) {
    console.error("File deletion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ファイル削除に失敗しました",
    };
  }
}

/**
 * File download handler
 * 添付ファイルのダウンロード処理
 */
export async function downloadAttachment(
  prisma: PrismaClient,
  env: Env,
  input: DownloadAttachmentInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { attachmentId } = input;

    // Get attachment info
    const attachment = await prisma.journalAttachment.findUnique({
      where: { attachmentId },
      include: {
        journalHeader: {
          select: {
            journalNumber: true,
            approvalStatus: true,
          },
        },
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: "指定されたファイルが見つかりません",
      };
    }

    // Prepare file data for download
    let fileData: string;
    
    if (env.R2_BUCKET) {
      // Fetch from R2 bucket
      try {
        const object = await env.R2_BUCKET.get(attachment.fileName);
        if (!object) {
          return {
            success: false,
            error: "ファイルデータが見つかりません",
          };
        }
        const arrayBuffer = await object.arrayBuffer();
        fileData = Buffer.from(arrayBuffer).toString('base64');
      } catch (r2Error) {
        console.error("R2 fetch error:", r2Error);
        return {
          success: false,
          error: "ファイルの取得に失敗しました",
        };
      }
    } else {
      // For mock/development, try to fetch from URL
      try {
        const response = await fetch(attachment.fileUrl);
        if (!response.ok) {
          return {
            success: false,
            error: "ファイルの取得に失敗しました",
          };
        }
        const arrayBuffer = await response.arrayBuffer();
        fileData = Buffer.from(arrayBuffer).toString('base64');
      } catch (fetchError) {
        console.error("File fetch error:", fetchError);
        return {
          success: false,
          error: "ファイルの取得に失敗しました",
        };
      }
    }

    return {
      success: true,
      data: {
        attachmentId: attachment.attachmentId,
        originalFileName: attachment.originalFileName,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: Number(attachment.fileSize),
        fileData, // Base64 encoded file data
        journalNumber: attachment.journalNumber,
        uploadedAt: attachment.uploadedAt.toISOString(),
      },
    };

  } catch (error) {
    console.error("File download error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ファイルダウンロードに失敗しました",
    };
  }
}

/**
 * Get file metadata
 * ファイルメタデータの取得
 */
export async function getFileMetadata(
  prisma: PrismaClient,
  attachmentId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const attachment = await prisma.journalAttachment.findUnique({
      where: { attachmentId },
      include: {
        journalHeader: {
          select: {
            journalNumber: true,
            journalDate: true,
            description: true,
            approvalStatus: true,
          },
        },
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: "指定されたファイルが見つかりません",
      };
    }

    return {
      success: true,
      data: {
        attachmentId: attachment.attachmentId,
        originalFileName: attachment.originalFileName,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: Number(attachment.fileSize),
        fileExtension: attachment.fileExtension,
        uploadedAt: attachment.uploadedAt.toISOString(),
        journalInfo: {
          journalNumber: attachment.journalHeader.journalNumber,
          journalDate: attachment.journalHeader.journalDate.toISOString(),
          description: attachment.journalHeader.description,
          approvalStatus: attachment.journalHeader.approvalStatus,
        },
      },
    };

  } catch (error) {
    console.error("Get file metadata error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ファイル情報の取得に失敗しました",
    };
  }
}