import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { generateReactHelpers } from "@uploadthing/react";

// UploadThing React helpers
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

// ファイルアップロード結果の型
export interface UploadedFile {
  name: string;
  size: number;
  key: string;
  url: string;
}

// 添付ファイル情報の型
export interface AttachmentInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// 仕訳添付ファイルの型
export interface JournalAttachment extends AttachmentInfo {
  journalId: string;
  journalNumber: string;
}