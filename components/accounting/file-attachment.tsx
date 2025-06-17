/**
 * ファイル添付・表示コンポーネント
 * ============================================================================
 * 仕訳関連画面で使用するファイル添付機能の共通コンポーネント
 * ============================================================================
 */

"use client";

import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  X,
  Download,
  Plus,
} from "lucide-react";

// ファイル情報の型定義
export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt?: Date;
}

interface FileAttachmentProps {
  files?: AttachedFile[];
  onFilesChange?: (files: File[]) => void;
  onFileDelete?: (fileId: string) => void;
  onFileDownload?: (file: AttachedFile) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // bytes
  acceptedFileTypes?: string[];
  className?: string;
  mode?: "upload" | "display"; // アップロード可能か表示のみか
}

export function FileAttachment({
  files = [],
  onFilesChange,
  onFileDelete,
  onFileDownload,
  disabled = false,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".xlsx",
    ".xls",
    ".docx",
    ".doc",
  ],
  className,
  mode = "upload",
}: FileAttachmentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルタイプからアイコンを取得
  const getFileIcon = (type: string, fileName: string) => {
    const ext = fileName.toLowerCase().split(".").pop();

    if (
      type.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")
    ) {
      return <FileImage className="h-5 w-5" />;
    }

    if (["xlsx", "xls", "csv"].includes(ext || "")) {
      return <FileSpreadsheet className="h-5 w-5" />;
    }

    if (["pdf", "doc", "docx", "txt"].includes(ext || "")) {
      return <FileText className="h-5 w-5" />;
    }

    return <FileIcon className="h-5 w-5" />;
  };

  // ファイルサイズを読みやすい形式に変換
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // ファイル検証
  const validateFiles = (fileList: FileList): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      // ファイルサイズチェック
      if (file.size > maxFileSize) {
        errors.push(
          `${file.name}: ファイルサイズが大きすぎます (最大${formatFileSize(
            maxFileSize
          )})`
        );
        return;
      }

      // ファイルタイプチェック
      const fileExt = "." + file.name.toLowerCase().split(".").pop();
      if (!acceptedFileTypes.includes(fileExt)) {
        errors.push(
          `${file.name}: この形式のファイルはアップロードできません（対応形式：PDF、JPG、PNG、Excel、Word）`
        );
        return;
      }

      validFiles.push(file);
    });

    // ファイル数チェック
    if (files.length + validFiles.length > maxFiles) {
      errors.push(`ファイル数の上限を超えています (最大${maxFiles}件)`);
      return [];
    }

    if (errors.length > 0) {
      setError(errors.join("\n"));
      return [];
    }

    setError(null);
    return validFiles;
  };

  // ファイル選択処理
  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0 || !onFilesChange) return;

      const validFiles = validateFiles(fileList);
      if (validFiles.length > 0) {
        onFilesChange(validFiles);
      }
    },
    [
      files.length,
      maxFiles,
      maxFileSize,
      acceptedFileTypes,
      onFilesChange,
      validateFiles,
    ]
  );

  // ドラッグ&ドロップ処理
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && mode === "upload") {
        setIsDragging(true);
      }
    },
    [disabled, mode]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || mode !== "upload") return;

      handleFileSelect(e.dataTransfer.files);
    },
    [disabled, mode, handleFileSelect]
  );

  // ファイル入力クリック
  const handleUploadClick = () => {
    if (!disabled && mode === "upload") {
      fileInputRef.current?.click();
    }
  };

  // ファイルダウンロード処理
  const handleDownload = (file: AttachedFile) => {
    if (onFileDownload) {
      onFileDownload(file);
    } else if (file.url) {
      // デフォルトのダウンロード処理
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* アップロードエリア（アップロードモードの場合のみ） */}
      {mode === "upload" && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              ファイルをドラッグ&ドロップまたは
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={disabled}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              ファイルを選択
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            対応形式: {acceptedFileTypes.join(", ")} / 最大サイズ:{" "}
            {formatFileSize(maxFileSize)} / 最大{maxFiles}件
          </p>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
          {error.split("\n").map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}

      {/* ファイル一覧 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleDownload(file)}
              >
                <div className="flex-shrink-0 text-gray-500">
                  {getFileIcon(file.type, file.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <div className="flex gap-1">
                  {/* ダウンロードボタン */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    className="h-8 w-8 p-0"
                    title="ダウンロード"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* 削除ボタン（アップロードモードの場合のみ） */}
                  {mode === "upload" && onFileDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(file.id);
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      disabled={disabled}
                      title="削除"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(",")}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
