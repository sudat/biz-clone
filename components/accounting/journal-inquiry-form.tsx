/**
 * 仕訳照会フォームコンポーネント
 * ============================================================================
 * 仕訳作成フォームと同じ構造で照会専用のフォーム
 * ============================================================================
 */

"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

import { JournalHeaderSection } from "./journal-header-section";
import { JournalInquirySide } from "./journal-inquiry-side";
import { BalanceMonitor } from "./balance-monitor";
import type {
  JournalInquiryData,
  JournalDetailInquiryData,
} from "@/app/actions/journal-inquiry";

interface JournalInquiryFormProps {
  journalData: JournalInquiryData;
  onUpdate?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function JournalInquiryForm({
  journalData,
  onUpdate,
  onDelete,
  className,
}: JournalInquiryFormProps) {
  const [selectedDetail, setSelectedDetail] =
    useState<JournalDetailInquiryData | null>(null);

  // 日付を8桁のYYYYMMDD形式に変換
  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  };

  // 借方・貸方の明細と合計を計算
  const debitDetails = useMemo(
    () => journalData.details.filter((detail) => detail.debitCredit === "D"),
    [journalData.details]
  );

  const creditDetails = useMemo(
    () => journalData.details.filter((detail) => detail.debitCredit === "C"),
    [journalData.details]
  );

  const debitTotal = useMemo(
    () => debitDetails.reduce((sum, detail) => sum + detail.totalAmount, 0),
    [debitDetails]
  );

  const creditTotal = useMemo(
    () => creditDetails.reduce((sum, detail) => sum + detail.totalAmount, 0),
    [creditDetails]
  );

  // 初期表示用の明細を取得（各サイドの1行目）
  const initialDebitDetail = debitDetails[0] || null;
  const initialCreditDetail = creditDetails[0] || null;

  // 明細クリック時の処理
  const handleDetailClick = (detail: JournalDetailInquiryData) => {
    setSelectedDetail(detail);
  };

  // 表示する明細を決定（選択されたものがあればそれ、なければ初期表示）
  const displayedDebitDetail =
    selectedDetail?.debitCredit === "D" ? selectedDetail : initialDebitDetail;
  const displayedCreditDetail =
    selectedDetail?.debitCredit === "C" ? selectedDetail : initialCreditDetail;

  // フォームデータを作成（JournalHeaderSectionで使用）
  const formData = {
    header: {
      journalDate: formatDateToYYYYMMDD(journalData.journalDate),
      description: journalData.description || "",
    },
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* ヘッダーセクション */}
      <JournalHeaderSection
        journalNumber={journalData.journalNumber}
        formData={formData}
        readOnly={true}
      />

      {/* バランス監視バー */}
      <BalanceMonitor
        debitTotal={debitTotal}
        creditTotal={creditTotal}
        onUpdate={onUpdate}
        onDelete={onDelete}
        mode="inquiry"
        hasDetails={journalData.details.length > 0}
        detailsCount={journalData.details.length}
      />

      {/* メイン表示エリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 借方サイド */}
        <div className="space-y-4">
          <JournalInquirySide
            type="debit"
            details={journalData.details}
            displayedDetail={displayedDebitDetail}
            selectedDetail={selectedDetail}
            onDetailClick={handleDetailClick}
            total={debitTotal}
          />
        </div>

        {/* 貸方サイド */}
        <div className="space-y-4">
          <JournalInquirySide
            type="credit"
            details={journalData.details}
            displayedDetail={displayedCreditDetail}
            selectedDetail={selectedDetail}
            onDetailClick={handleDetailClick}
            total={creditTotal}
          />
        </div>
      </div>
    </div>
  );
}
