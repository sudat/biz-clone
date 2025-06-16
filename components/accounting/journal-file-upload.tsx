"use client";

import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UploadedFile } from "@/types/uploadthing";

interface JournalFileUploadProps {
  journalId?: string;
  onFilesUploaded?: (files: UploadedFile[]) => void;
}

export function JournalFileUpload({ journalId, onFilesUploaded }: JournalFileUploadProps) {
  const handleUploadComplete = (files: UploadedFile[]) => {
    console.log("アップロード完了:", files);
    onFilesUploaded?.(files);
    
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
          maxFiles={5}
        />
      </CardContent>
    </Card>
  );
}