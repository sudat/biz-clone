/**
 * 仕訳照会サイドコンポーネント
 * ============================================================================
 * 借方・貸方の照会エリアと明細リストを統合したサイドコンポーネント
 * ============================================================================
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { JournalDetailInquiry } from "./journal-detail-inquiry";
import { JournalDetailInquiryList } from "./journal-detail-inquiry-list";
import type { JournalDetailInquiryData } from "@/app/actions/journal-inquiry";

interface JournalInquirySideProps {
  type: 'debit' | 'credit';
  details: JournalDetailInquiryData[];
  displayedDetail: JournalDetailInquiryData | null;
  selectedDetail: JournalDetailInquiryData | null;
  onDetailClick: (detail: JournalDetailInquiryData) => void;
  total: number;
  className?: string;
}

export function JournalInquirySide({
  type,
  details,
  displayedDetail,
  selectedDetail,
  onDetailClick,
  total,
  className
}: JournalInquirySideProps) {
  // 該当する借方・貸方の明細のみフィルタ
  const filteredDetails = details.filter(detail => 
    type === 'debit' ? detail.debitCredit === 'D' : detail.debitCredit === 'C'
  );

  return (
    <div className={cn("space-y-4 h-full flex flex-col", className)}>
      {/* 明細表示フォーム */}
      <div className="flex-shrink-0">
        <JournalDetailInquiry
          type={type}
          detail={displayedDetail}
        />
      </div>
      
      {/* 明細リスト */}
      <div className="flex-1 min-h-0">
        <JournalDetailInquiryList
          type={type}
          details={filteredDetails}
          selectedDetail={selectedDetail}
          onDetailClick={onDetailClick}
          total={total}
        />
      </div>
    </div>
  );
}