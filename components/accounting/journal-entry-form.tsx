/**
 * メイン仕訳入力フォームコンポーネント
 * ============================================================================
 * すべての仕訳入力コンポーネントを統合したメインフォーム
 * ============================================================================
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";

import { JournalHeaderSection } from "./journal-header-section";
import { JournalEntrySide } from "./journal-entry-side";
import { BalanceMonitor } from "./balance-monitor";
import { FileAttachment, type AttachedFile } from "./file-attachment";
import { JournalDetailData, JournalSaveData } from "@/types/journal";
import { useUploadThing } from "@/lib/uploadthing";
import { saveJournalAttachment } from "@/app/actions/journal-attachments";

// 今日の日付をYYYYMMDD形式で取得
const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// 日付文字列をDate型に変換
const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
    return null;
  }
  
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));
  
  const date = new Date(year, month - 1, day);
  
  // 有効な日付かチェック
  if (date.getFullYear() === year && 
      date.getMonth() === month - 1 && 
      date.getDate() === day) {
    return date;
  }
  
  return null;
};

// Zodスキーマ - バリデーションを最小限に（保存時チェックに変更）
const journalEntrySchema = z.object({
  header: z.object({
    journalDate: z.string().optional(),
    description: z.string().optional()
  })
});

type JournalEntryForm = z.infer<typeof journalEntrySchema>;

interface JournalEntryFormProps {
  onSubmit?: (data: JournalSaveData) => Promise<void>;
  initialData?: Partial<JournalEntryForm>;
  initialDetails?: JournalDetailData[];
  journalNumber?: string;
  disabled?: boolean;
  className?: string;
  createdUser?: {
    userId: string;
    userCode: string;
    userName: string;
    userKana: string | null;
  } | null;
  approvedUser?: {
    userId: string;
    userCode: string;
    userName: string;
    userKana: string | null;
  } | null;
  initialFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFileDelete?: (fileId: string) => void;
}

export function JournalEntryForm({
  onSubmit,
  initialData,
  initialDetails,
  journalNumber,
  disabled = false,
  className,
  createdUser,
  approvedUser,
  initialFiles = [],
  onFilesChange,
  onFileDelete
}: JournalEntryFormProps) {
  const [details, setDetails] = useState<JournalDetailData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  
  // 明細クリック反映機能用の状態
  const [selectedDetail, setSelectedDetail] = useState<JournalDetailData | null>(null);
  const [displayMode, setDisplayMode] = useState<'input' | 'edit'>('input');

  // UploadThing フック
  const { startUpload, isUploading: uploadingState } = useUploadThing("journalAttachment", {
    onClientUploadComplete: (res) => {
      console.log("アップロード完了:", res);
      setIsUploading(false);
    },
    onUploadError: (error: Error) => {
      console.error("アップロードエラー:", error);
      alert(`アップロードエラー: ${error.message}`);
      setIsUploading(false);
    },
  });

  // 初期明細データの設定
  useEffect(() => {
    if (initialDetails && initialDetails.length > 0) {
      setDetails(initialDetails);
    }
  }, [initialDetails]);

  const form = useForm<JournalEntryForm>({
    resolver: zodResolver(journalEntrySchema),
    mode: "onSubmit", // 保存時のみバリデーション
    defaultValues: {
      header: {
        journalDate: getTodayString(),
        description: initialData?.header?.description || ""
      }
    }
  });

  // 借方・貸方の集計
  const debitDetails = useMemo(() => 
    details.filter(detail => detail.debitCredit === 'debit'), 
    [details]
  );
  
  const creditDetails = useMemo(() => 
    details.filter(detail => detail.debitCredit === 'credit'), 
    [details]
  );

  const debitTotal = useMemo(() => 
    debitDetails.reduce((sum, detail) => sum + detail.totalAmount, 0), 
    [debitDetails]
  );
  
  const creditTotal = useMemo(() => 
    creditDetails.reduce((sum, detail) => sum + detail.totalAmount, 0), 
    [creditDetails]
  );

  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;
  const hasDetails = details.length > 0;
  const canSave = isBalanced && hasDetails && !isSubmitting;

  // 明細追加
  const handleAddDetail = (detail: JournalDetailData) => {
    setDetails(prev => [...prev, detail]);
  };

  // 明細削除
  const handleRemoveDetail = (index: number) => {
    setDetails(prev => prev.filter((_, i) => i !== index));
    // 削除された明細が選択中の場合、選択を解除
    if (selectedDetail && details[index] === selectedDetail) {
      setSelectedDetail(null);
      setDisplayMode('input');
    }
  };

  // 明細クリック処理
  const handleDetailClick = (detail: JournalDetailData) => {
    setSelectedDetail(detail);
    setDisplayMode('edit');
  };

  // 編集キャンセル処理
  const handleCancelEdit = () => {
    setSelectedDetail(null);
    setDisplayMode('input');
  };

  // 明細更新処理
  const handleUpdateDetail = (updatedDetail: JournalDetailData) => {
    if (selectedDetail) {
      const index = details.findIndex(d => d === selectedDetail);
      if (index !== -1) {
        setDetails(prev => prev.map((d, i) => i === index ? updatedDetail : d));
        setSelectedDetail(null);
        setDisplayMode('input');
      }
    }
  };

  // ファイル変更処理
  const handleFilesChange = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      // UploadThingを使ってファイルをアップロード
      const uploadResults = await startUpload(newFiles);
      
      if (!uploadResults) {
        throw new Error("ファイルのアップロードに失敗しました");
      }

      // アップロード成功したファイル情報をAttachedFile形式に変換
      const newAttachedFiles: AttachedFile[] = [];
      
      for (const result of uploadResults) {
        // 新しい添付ファイル情報を作成
        const newAttachedFile: AttachedFile = {
          id: `uploaded-${Date.now()}-${Math.random()}`,
          name: result.name,
          size: result.size,
          type: result.type || 'application/octet-stream',
          url: result.url,
          uploadedAt: new Date()
        };
        
        newAttachedFiles.push(newAttachedFile);

        // UploadThingにアップロード済み、仕訳保存時にデータベースに保存する
      }
      
      // 状態を更新
      setAttachedFiles(prev => [...prev, ...newAttachedFiles]);
      
      // 親コンポーネントに通知（新しくアップロードされたファイル情報を渡す）
      if (onFilesChange) {
        onFilesChange(newAttachedFiles);
      }

      console.log("ファイルアップロード完了:", newAttachedFiles);
      
    } catch (error) {
      console.error("ファイルアップロードエラー:", error);
      alert(`ファイルのアップロードに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  // ファイル削除処理
  const handleFileDelete = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
    
    // 親コンポーネントに通知
    if (onFileDelete) {
      onFileDelete(fileId);
    }
  };

  // フォーム送信
  const handleSubmit = async (formData: JournalEntryForm) => {
    if (!canSave || !onSubmit) return;

    setIsSubmitting(true);
    try {
      // 詳細バリデーション（保存時のみ）
      const validationErrors: string[] = [];
      
      // 日付チェック
      if (!formData.header.journalDate || formData.header.journalDate.length !== 8) {
        validationErrors.push("計上日は8桁で入力してください");
      } else {
        const parsedDate = parseDateString(formData.header.journalDate);
        if (!parsedDate) {
          validationErrors.push("有効な日付を入力してください（例: 20250115）");
        }
      }
      
      // 明細チェック
      if (details.length === 0) {
        validationErrors.push("明細を少なくとも1件追加してください");
      }
      
      // バランスチェック
      if (!isBalanced) {
        validationErrors.push(`借方と貸方の合計が一致していません（差額: ¥${Math.abs(debitTotal - creditTotal).toLocaleString()}）`);
      }
      
      // エラーがある場合は表示して停止
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join("\n"));
      }
      
      // 日付変換（バリデーション済みなのでnullチェック不要だが、型安全性のため確認）
      const parsedDate = parseDateString(formData.header.journalDate!);
      if (!parsedDate) {
        throw new Error("日付の変換に失敗しました");
      }

      const journalSaveData: JournalSaveData = {
        header: {
          journalDate: parsedDate,
          description: formData.header.description
        },
        details,
        attachedFiles: attachedFiles.map(file => ({
          name: file.name,
          url: file.url || '',
          size: file.size,
          type: file.type
        }))
      };
      
      await onSubmit(journalSaveData);
      
      // 成功したらフォームをリセット
      form.reset();
      setDetails([]);
    } catch (error) {
      console.error('仕訳保存エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // フォームリセット
  const handleReset = () => {
    form.reset();
    setDetails([]);
    setSelectedDetail(null);
    setDisplayMode('input');
    setAttachedFiles([]);
    setIsUploading(false);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* ヘッダーセクション */}
          <JournalHeaderSection 
            control={form.control} 
            journalNumber={journalNumber}
            createdUser={createdUser}
            approvedUser={approvedUser}
          />

          {/* バランス監視バー */}
          <BalanceMonitor 
            debitTotal={debitTotal}
            creditTotal={creditTotal}
            onSubmit={() => form.handleSubmit(handleSubmit)()}
            onReset={handleReset}
            canSave={canSave}
            isSubmitting={isSubmitting}
            hasDetails={hasDetails}
            detailsCount={details.length}
            disabled={disabled}
          />

          {/* メイン入力エリア */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 借方サイド */}
            <div className="space-y-4">
              <JournalEntrySide
                type="debit"
                details={details}
                onAddDetail={handleAddDetail}
                onUpdateDetail={handleUpdateDetail}
                onRemoveDetail={handleRemoveDetail}
                onDetailClick={handleDetailClick}
                onCancelEdit={handleCancelEdit}
                selectedDetail={selectedDetail?.debitCredit === 'debit' ? selectedDetail : null}
                displayMode={displayMode}
                total={debitTotal}
                disabled={disabled || isSubmitting}
              />
            </div>

            {/* 貸方サイド */}
            <div className="space-y-4">
              <JournalEntrySide
                type="credit"
                details={details}
                onAddDetail={handleAddDetail}
                onUpdateDetail={handleUpdateDetail}
                onRemoveDetail={handleRemoveDetail}
                onDetailClick={handleDetailClick}
                onCancelEdit={handleCancelEdit}
                selectedDetail={selectedDetail?.debitCredit === 'credit' ? selectedDetail : null}
                displayMode={displayMode}
                total={creditTotal}
                disabled={disabled || isSubmitting}
              />
            </div>
          </div>

          {/* ファイル添付エリア */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">添付ファイル</h3>
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  アップロード中...
                </div>
              )}
            </div>
            <FileAttachment
              files={attachedFiles}
              onFilesChange={handleFilesChange}
              onFileDelete={handleFileDelete}
              disabled={disabled || isSubmitting || isUploading}
              mode="upload"
              className="w-full"
            />
          </div>

        </form>
      </Form>
    </div>
  );
}