/**
 * 仕訳入力サイドコンポーネント
 * ============================================================================
 * 借方・貸方の入力エリアと明細リストを統合したサイドコンポーネント
 * ============================================================================
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { JournalDetailInput } from "./journal-detail-input";
import { JournalDetailData } from "@/types/journal";
import { JournalDetailList } from "./journal-detail-list";

interface JournalEntrySideProps {
  type: 'debit' | 'credit';
  details: JournalDetailData[];
  onAddDetail: (detail: JournalDetailData) => void;
  onUpdateDetail?: (detail: JournalDetailData) => void;
  onRemoveDetail: (index: number) => void;
  onDetailClick?: (detail: JournalDetailData) => void;
  onCancelEdit?: () => void;
  selectedDetail?: JournalDetailData | null;
  displayMode?: 'input' | 'edit';
  total: number;
  disabled?: boolean;
  className?: string;
}

export function JournalEntrySide({
  type,
  details,
  onAddDetail,
  onUpdateDetail,
  onRemoveDetail,
  onDetailClick,
  onCancelEdit,
  selectedDetail,
  displayMode = 'input',
  total,
  disabled = false,
  className
}: JournalEntrySideProps) {
  return (
    <div className={cn("space-y-4 h-full flex flex-col", className)}>
      {/* 明細入力フォーム */}
      <div className="flex-shrink-0">
        <JournalDetailInput
          type={type}
          onAdd={onAddDetail}
          onUpdate={onUpdateDetail}
          onCancelEdit={onCancelEdit}
          editingDetail={selectedDetail}
          mode={displayMode}
          disabled={disabled}
        />
      </div>
      
      {/* 明細リスト */}
      <div className="flex-1 min-h-0">
        <JournalDetailList
          type={type}
          details={details}
          onRemove={onRemoveDetail}
          onDetailClick={onDetailClick}
          selectedDetail={selectedDetail}
          total={total}
          disabled={disabled}
        />
      </div>
    </div>
  );
}