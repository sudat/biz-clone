/**
 * 仕訳ファイル添付用Server Actions
 * ============================================================================
 * ファイルの保存・取得・削除処理
 * ============================================================================
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";

// ファイル添付データ型
export interface JournalAttachmentData {
  attachmentId: string;
  journalNumber: string;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  fileExtension: string;
  mimeType: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 仕訳にファイルを添付
 */
export async function saveJournalAttachment(params: {
  journalNumber: string;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}): Promise<{
  success: boolean;
  data?: JournalAttachmentData;
  error?: string;
}> {
  try {
    const { journalNumber, fileName, originalFileName, fileUrl, fileSize, mimeType } = params;

    // ファイル拡張子を取得
    const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || '';

    // 仕訳存在確認
    const journal = await prisma.journalHeader.findUnique({
      where: { journalNumber },
    });

    if (!journal) {
      return {
        success: false,
        error: "指定された仕訳が見つかりません",
      };
    }

    // ファイル添付保存
    const attachment = await prisma.journalAttachment.create({
      data: {
        journalNumber,
        fileName,
        originalFileName,
        fileUrl,
        fileSize: BigInt(fileSize),
        fileExtension,
        mimeType,
      },
    });

    // BigIntをnumberに変換してレスポンス
    const attachmentData: JournalAttachmentData = {
      attachmentId: attachment.attachmentId,
      journalNumber: attachment.journalNumber,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
      fileUrl: attachment.fileUrl,
      fileSize: Number(attachment.fileSize),
      fileExtension: attachment.fileExtension,
      mimeType: attachment.mimeType,
      uploadedAt: attachment.uploadedAt,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    };

    // キャッシュ更新
    revalidatePath("/siwake");
    revalidatePath("/siwake/shokai");

    return {
      success: true,
      data: attachmentData,
    };
  } catch (error) {
    console.error("ファイル添付保存エラー:", error);
    return {
      success: false,
      error: "ファイルの保存に失敗しました",
    };
  }
}

/**
 * 仕訳に添付されたファイル一覧を取得
 */
export async function getJournalAttachments(
  journalNumber: string,
): Promise<{
  success: boolean;
  data?: JournalAttachmentData[];
  error?: string;
}> {
  try {
    const attachments = await prisma.journalAttachment.findMany({
      where: { journalNumber },
      orderBy: { uploadedAt: "desc" },
    });

    // BigIntをnumberに変換
    const attachmentData: JournalAttachmentData[] = attachments.map((attachment) => ({
      attachmentId: attachment.attachmentId,
      journalNumber: attachment.journalNumber,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
      fileUrl: attachment.fileUrl,
      fileSize: Number(attachment.fileSize),
      fileExtension: attachment.fileExtension,
      mimeType: attachment.mimeType,
      uploadedAt: attachment.uploadedAt,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    }));

    return {
      success: true,
      data: attachmentData,
    };
  } catch (error) {
    console.error("ファイル一覧取得エラー:", error);
    return {
      success: false,
      error: "ファイル一覧の取得に失敗しました",
    };
  }
}

/**
 * 仕訳からファイルを削除
 */
export async function deleteJournalAttachment(
  attachmentId: string,
): Promise<{
  success: boolean;
  deletedFileUrl?: string;
  error?: string;
}> {
  try {
    // 削除対象のファイル情報を取得
    const attachment = await prisma.journalAttachment.findUnique({
      where: { attachmentId },
    });

    if (!attachment) {
      return {
        success: false,
        error: "指定されたファイルが見つかりません",
      };
    }

    // データベースから削除
    await prisma.journalAttachment.delete({  
      where: { attachmentId },
    });

    // キャッシュ更新
    revalidatePath("/siwake");
    revalidatePath("/siwake/shokai");

    return {
      success: true,
      deletedFileUrl: attachment.fileUrl,
    };
  } catch (error) {
    console.error("ファイル削除エラー:", error);
    return {
      success: false,
      error: "ファイルの削除に失敗しました",
    };
  }
}

/**
 * 複数ファイルを一括保存
 */
export async function saveMultipleJournalAttachments(params: {
  journalNumber: string;
  files: Array<{
    fileName: string;
    originalFileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}): Promise<{
  success: boolean;
  data?: JournalAttachmentData[];
  errors?: string[];
}> {
  try {
    const { journalNumber, files } = params;

    // 仕訳存在確認
    const journal = await prisma.journalHeader.findUnique({
      where: { journalNumber },
    });

    if (!journal) {
      return {
        success: false,
        errors: ["指定された仕訳が見つかりません"],
      };
    }

    const savedAttachments: JournalAttachmentData[] = [];
    const errors: string[] = [];

    // 各ファイルを順次保存
    for (const file of files) {
      try {
        const fileExtension = file.originalFileName.split('.').pop()?.toLowerCase() || '';

        const attachment = await prisma.journalAttachment.create({
          data: {
            journalNumber,
            fileName: file.fileName,
            originalFileName: file.originalFileName,
            fileUrl: file.fileUrl,
            fileSize: BigInt(file.fileSize),
            fileExtension,
            mimeType: file.mimeType,
          },
        });

        savedAttachments.push({
          attachmentId: attachment.attachmentId,
          journalNumber: attachment.journalNumber,
          fileName: attachment.fileName,
          originalFileName: attachment.originalFileName,
          fileUrl: attachment.fileUrl,
          fileSize: Number(attachment.fileSize),
          fileExtension: attachment.fileExtension,
          mimeType: attachment.mimeType,
          uploadedAt: attachment.uploadedAt,
          createdAt: attachment.createdAt,
          updatedAt: attachment.updatedAt,
        });
      } catch (error) {
        console.error(`ファイル${file.originalFileName}の保存エラー:`, error);
        errors.push(`${file.originalFileName}の保存に失敗しました`);
      }
    }

    // キャッシュ更新
    if (savedAttachments.length > 0) {
      revalidatePath("/siwake");
      revalidatePath("/siwake/shokai");
    }

    return {
      success: savedAttachments.length > 0,
      data: savedAttachments,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("複数ファイル保存エラー:", error);
    return {
      success: false,
      errors: ["ファイルの一括保存に失敗しました"],
    };
  }
}

/**
 * 仕訳削除時にすべての添付ファイルを削除
 */
export async function deleteAllJournalAttachments(
  journalNumber: string,
): Promise<{
  success: boolean;
  deletedFiles?: string[];
  error?: string;
}> {
  try {
    // 削除対象のファイル一覧を取得
    const attachments = await prisma.journalAttachment.findMany({
      where: { journalNumber },
      select: { fileUrl: true, originalFileName: true },
    });

    if (attachments.length === 0) {
      return {
        success: true,
        deletedFiles: [],
      };
    }

    // データベースから削除
    await prisma.journalAttachment.deleteMany({
      where: { journalNumber },
    });

    const deletedFiles = attachments.map((attachment) => attachment.fileUrl);

    return {
      success: true,
      deletedFiles,
    };
  } catch (error) {
    console.error("仕訳添付ファイル一括削除エラー:", error);
    return {
      success: false,
      error: "添付ファイルの削除に失敗しました",
    };
  }
}

/**
 * ファイルサイズや拡張子の制限チェック
 */
function validateFileUpload(
  file: File,
  options: {
    maxSizeBytes?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
  } = {},
): { isValid: boolean; error?: string } {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // デフォルト10MB
    allowedExtensions = [
      'pdf', 'jpg', 'jpeg', 'png', 'gif', 'xlsx', 'xls', 'docx', 'doc', 'txt'
    ],
    allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png', 
      'image/gif',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ],
  } = options;

  // ファイルサイズチェック
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `ファイルサイズが制限を超えています（最大${Math.floor(maxSizeBytes / 1024 / 1024)}MB）`,
    };
  }

  // 拡張子チェック
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `対応していないファイル形式です（対応形式: ${allowedExtensions.join(', ')}）`,
    };
  }

  // MIMEタイプチェック
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "対応していないファイル形式です",
    };
  }

  return { isValid: true };
}

/**
 * ファイルアップロード時の詳細なエラーハンドリング
 */
export async function handleFileUploadError(
  error: unknown,
  context: {
    journalNumber?: string;
    fileName?: string;
    operation: "upload" | "delete" | "download";
  }
): Promise<{ error: string; code?: string }> {
  console.error(`ファイル${context.operation}エラー:`, {
    error,
    context,
    timestamp: new Date().toISOString(),
  });

  // エラーの種類に応じた適切なメッセージを返す
  if (error instanceof Error) {
    // Prismaエラー
    if (error.message.includes("Foreign key constraint")) {
      return {
        error: "指定された仕訳が存在しません",
        code: "JOURNAL_NOT_FOUND",
      };
    }

    // ファイルサイズエラー
    if (error.message.includes("file too large")) {
      return {
        error: "ファイルサイズが制限を超えています",
        code: "FILE_TOO_LARGE",
      };
    }

    // UploadThingエラー
    if (error.message.includes("UploadThing")) {
      return {
        error: "ファイルサーバーでエラーが発生しました",
        code: "UPLOAD_SERVICE_ERROR",
      };
    }

    // ネットワークエラー
    if (error.message.includes("fetch")) {
      return {
        error: "ネットワークエラーが発生しました",
        code: "NETWORK_ERROR",
      };
    }

    return {
      error: error.message,
      code: "UNKNOWN_ERROR",
    };
  }

  return {
    error: "予期しないエラーが発生しました",
    code: "UNEXPECTED_ERROR",
  };
}

/**
 * ファイル整合性チェック
 */
export async function verifyFileIntegrity(params: {
  journalNumber: string;
  expectedFiles: string[];
}): Promise<{
  success: boolean;
  missingFiles?: string[];
  orphanedFiles?: string[];
  error?: string;
}> {
  try {
    const { journalNumber, expectedFiles } = params;

    // データベースに保存されているファイル一覧を取得
    const attachments = await prisma.journalAttachment.findMany({
      where: { journalNumber },
      select: {
        fileName: true,
        originalFileName: true,
        fileUrl: true,
      },
    });

    const actualFiles = attachments.map((a) => a.fileName);

    // 不足ファイル検出
    const missingFiles = expectedFiles.filter((file) => !actualFiles.includes(file));

    // 孤立ファイル検出（期待されていないファイル）
    const orphanedFiles = actualFiles.filter((file) => !expectedFiles.includes(file));

    return {
      success: missingFiles.length === 0 && orphanedFiles.length === 0,
      missingFiles: missingFiles.length > 0 ? missingFiles : undefined,
      orphanedFiles: orphanedFiles.length > 0 ? orphanedFiles : undefined,
    };
  } catch (error) {
    console.error("ファイル整合性チェックエラー:", error);
    return {
      success: false,
      error: "ファイル整合性の確認に失敗しました",
    };
  }
}

/**
 * 仕訳のファイル添付状況サマリーを取得
 */
export async function getJournalAttachmentSummary(
  journalNumber: string,
): Promise<{
  success: boolean;
  data?: {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    hasFiles: boolean;
  };
  error?: string;
}> {
  try {
    const attachments = await prisma.journalAttachment.findMany({
      where: { journalNumber },
      select: {
        fileSize: true,
        fileExtension: true,
        mimeType: true,
      },
    });

    if (attachments.length === 0) {
      return {
        success: true,
        data: {
          totalFiles: 0,
          totalSize: 0,
          fileTypes: {},
          hasFiles: false,
        },
      };
    }

    // ファイルタイプ別の集計
    const fileTypes: Record<string, number> = {};
    let totalSize = 0;

    for (const attachment of attachments) {
      const extension = attachment.fileExtension.toLowerCase();
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
      totalSize += Number(attachment.fileSize);
    }

    return {
      success: true,
      data: {
        totalFiles: attachments.length,
        totalSize,
        fileTypes,
        hasFiles: true,
      },
    };
  } catch (error) {
    console.error("添付ファイルサマリー取得エラー:", error);
    return {
      success: false,
      error: "添付ファイル情報の取得に失敗しました",
    };
  }
}