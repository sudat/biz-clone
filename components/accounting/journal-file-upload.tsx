"use client";

import { FileUpload } from "@/components/ui/file-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UploadedFile } from "@/types/uploadthing";

interface JournalFileUploadProps {
  onFilesChange?: (files: File[]) => void;
  className?: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  disabled?: boolean;
}

export function JournalFileUpload({
  onFilesChange,
  className,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
  ],
  disabled = false,
}: JournalFileUploadProps) {
  const handleUploadComplete = (files: UploadedFile[]) => {
    console.log("アップロード完了:", files);

    // UploadedFileからFileオブジェクトを作成できないため、
    // この関数は実際のファイルオブジェクトではなく、アップロード済みファイル情報を扱う
    // onFilesChangeの型を修正するか、別のハンドラーを使用する必要がある

    // TODO: 仕訳IDと関連付けてデータベースに保存
    // if (journalId) {
    //   saveJournalAttachments(journalId, files);
    // }
  };

  const handleUploadError = (error: Error) => {
    console.error("アップロードエラー:", error);
    // TODO: エラー通知の実装
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>添付ファイル</CardTitle>
        <CardDescription>
          仕訳に関連する領収書、請求書、契約書などのファイルをアップロードしてください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUpload
          endpoint="journalAttachment"
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          maxFiles={maxFiles}
        />
      </CardContent>
    </Card>
  );
}
