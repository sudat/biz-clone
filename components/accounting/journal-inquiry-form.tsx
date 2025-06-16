/**
 * 仕訳照会フォームコンポーネント
 * ============================================================================
 * 仕訳の詳細情報を表示する読み取り専用フォーム
 * 作成・更新画面と統一されたレイアウト構造
 * ============================================================================
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileAttachment, type AttachedFile } from "./file-attachment";
import { JournalHeaderSection } from "./journal-header-section";
import { BalanceMonitor } from "./balance-monitor";
import { JournalDetailList } from "./journal-detail-list";
import { JournalEntrySide } from "./journal-entry-side";
import type { JournalInquiryData } from "@/app/actions/journal-inquiry";
import type { JournalDetailData } from "@/types/journal";

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
  // 添付ファイルをAttachedFile形式に変換
  const attachedFiles: AttachedFile[] =
    journalData.attachments?.map((attachment) => ({
      id: attachment.attachmentId,
      name: attachment.originalFileName,
      size: attachment.fileSize,
      type: attachment.mimeType,
      url: attachment.fileUrl,
      uploadedAt: attachment.uploadedAt,
    })) || [];

  // 借方・貸方の集計および明細データ変換（update 画面と同形式に合わせる）
  const convertedDetails: JournalDetailData[] = journalData.details.map(
    (d) => ({
      debitCredit: d.debitCredit === "D" ? "debit" : "credit",
      accountCode: d.accountCode,
      accountName: d.accountName || undefined,
      subAccountCode: d.subAccountCode || undefined,
      subAccountName: d.subAccountName || undefined,
      partnerCode: d.partnerCode || undefined,
      partnerName: d.partnerName || undefined,
      analysisCode: d.analysisCode || undefined,
      analysisCodeName: d.analysisCodeName || undefined,
      baseAmount: d.baseAmount,
      taxAmount: d.taxAmount,
      totalAmount: d.totalAmount,
      taxCode: d.taxCode || undefined,
      description: d.lineDescription || undefined,
    })
  );

  const debitTotal = convertedDetails
    .filter((detail) => detail.debitCredit === "debit")
    .reduce((sum, detail) => sum + detail.totalAmount, 0);

  const creditTotal = convertedDetails
    .filter((detail) => detail.debitCredit === "credit")
    .reduce((sum, detail) => sum + detail.totalAmount, 0);

  // 日付をゼロ埋めでYYYYMMDD形式に整形
  const d = journalData.journalDate;
  const journalDateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(d.getDate()).padStart(2, "0")}`;

  const headerFormData = {
    header: {
      journalDate: journalDateStr,
      description: journalData.description || "",
    },
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* ヘッダーセクション（読み取り専用） */}
      <JournalHeaderSection
        journalNumber={journalData.journalNumber}
        formData={headerFormData}
        readOnly={true}
        createdUser={journalData.createdUser}
        approvedUser={journalData.approvedUser}
      />

      {/* バランス監視バー（更新/削除ボタン付き） */}
      <BalanceMonitor
        debitTotal={debitTotal}
        creditTotal={creditTotal}
        mode="inquiry"
        onUpdate={onUpdate}
        onDelete={onDelete}
        hasDetails={convertedDetails.length > 0}
        detailsCount={convertedDetails.length}
      />

      {/* メイン表示エリア（2カラムグリッド） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 借方サイド */}
        <div className="space-y-4">
          <JournalEntrySide
            type="debit"
            details={convertedDetails}
            onAddDetail={() => {}}
            onRemoveDetail={() => {}}
            onDetailClick={() => {}}
            total={debitTotal}
            disabled={true}
            selectedDetail={convertedDetails.find(
              (d) => d.debitCredit === "debit"
            )}
            displayMode="edit"
          />
        </div>

        {/* 貸方サイド */}
        <div className="space-y-4">
          <JournalEntrySide
            type="credit"
            details={convertedDetails}
            onAddDetail={() => {}}
            onRemoveDetail={() => {}}
            onDetailClick={() => {}}
            total={creditTotal}
            disabled={true}
            selectedDetail={convertedDetails.find(
              (d) => d.debitCredit === "credit"
            )}
            displayMode="edit"
          />
        </div>
      </div>

      {/* ファイル添付エリア */}
      {attachedFiles.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">添付ファイル</h3>
          <FileAttachment
            files={attachedFiles}
            mode="display"
            className="w-full"
          />
        </div>
      )}

      {/* 承認状況 */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">承認状況</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              承認ステータス
            </label>
            <div className="mt-1">
              <Badge
                className={cn(
                  "px-3 py-1 text-sm font-medium",
                  journalData.approvalStatus === "approved"
                    ? "bg-green-100 text-green-800"
                    : journalData.approvalStatus === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                )}
              >
                {journalData.approvalStatus === "approved"
                  ? "承認済み"
                  : journalData.approvalStatus === "rejected"
                  ? "却下"
                  : "承認待ち"}
              </Badge>
            </div>
          </div>

          {journalData.approvedAt && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                承認日時
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {journalData.approvedAt.toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </div>

        {journalData.rejectedReason && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">
              却下理由
            </label>
            <p className="text-sm text-red-600 mt-1">
              {journalData.rejectedReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
