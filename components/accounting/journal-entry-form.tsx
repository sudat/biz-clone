/**
 * メイン仕訳入力フォームコンポーネント
 * ============================================================================
 * すべての仕訳入力コンポーネントを統合したメインフォーム
 * ============================================================================
 */

"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";

import { JournalHeaderSection } from "./journal-header-section";
import { JournalEntrySide } from "./journal-entry-side";
import { BalanceMonitor } from "./balance-monitor";
import { JournalDetailData } from "./journal-detail-input";
import { JournalSaveData } from "@/app/actions/journal-save";

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
  journalNumber?: string;
  disabled?: boolean;
  className?: string;
}

export function JournalEntryForm({
  onSubmit,
  initialData,
  journalNumber,
  disabled = false,
  className
}: JournalEntryFormProps) {
  const [details, setDetails] = useState<JournalDetailData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    debitDetails.reduce((sum, detail) => sum + detail.amount, 0), 
    [debitDetails]
  );
  
  const creditTotal = useMemo(() => 
    creditDetails.reduce((sum, detail) => sum + detail.amount, 0), 
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
      
      // 日付変換
      const parsedDate = parseDateString(formData.header.journalDate!);

      const journalSaveData: JournalSaveData = {
        header: {
          journalDate: parsedDate,
          description: formData.header.description
        },
        details
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
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* ヘッダーセクション */}
          <JournalHeaderSection 
            control={form.control} 
            journalNumber={journalNumber}
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
                onRemoveDetail={handleRemoveDetail}
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
                onRemoveDetail={handleRemoveDetail}
                total={creditTotal}
                disabled={disabled || isSubmitting}
              />
            </div>
          </div>

        </form>
      </Form>
    </div>
  );
}