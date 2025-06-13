/**
 * 仕訳明細照会リストコンポーネント
 * ============================================================================
 * 照会用の明細一覧（クリック選択機能付き）
 * ============================================================================
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JournalDetailInquiryData } from "@/app/actions/journal-inquiry";

interface JournalDetailInquiryListProps {
  type: "debit" | "credit";
  details: JournalDetailInquiryData[];
  selectedDetail: JournalDetailInquiryData | null;
  onDetailClick: (detail: JournalDetailInquiryData) => void;
  total: number;
  className?: string;
}

export function JournalDetailInquiryList({
  type,
  details,
  selectedDetail,
  onDetailClick,
  total,
  className,
}: JournalDetailInquiryListProps) {
  const isDebit = type === "debit";
  const title = isDebit ? "借方明細一覧" : "貸方明細一覧";
  const bgColor = "bg-slate-50";
  const borderColor = "border-slate-200";

  if (details.length === 0) {
    return (
      <Card
        className={cn("h-full flex flex-col border-2", borderColor, bgColor, className)}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            <Badge variant={"secondary"} className="text-xs">
              0件 - ¥0
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground text-sm">
            {type === "debit" ? "借方" : "貸方"}明細がありません
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("h-full flex flex-col border-2", borderColor, bgColor, className)}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <Badge variant={"secondary"} className="text-xs">
            {details.length}件 - ¥{total.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-1">
        {details.map((detail) => {
          const isSelected = selectedDetail?.lineNumber === detail.lineNumber;

          return (
            <div
              key={detail.lineNumber}
              onClick={() => onDetailClick(detail)}
              className={cn(
                "p-1.5 rounded border transition-all duration-200 cursor-pointer",
                isSelected 
                  ? "bg-blue-100 border-blue-300 shadow-sm" 
                  : "bg-white/50 hover:bg-white/80 hover:border-slate-300",
                "border-slate-100",
                "group"
              )}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  {/* メイン行：勘定科目 + 金額 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-800 text-sm">
                        {detail.accountCode}
                      </span>
                      {detail.accountName && (
                        <span className="text-xs text-slate-600 truncate">
                          {detail.accountName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-sm font-mono font-semibold text-slate-800">
                        ¥{detail.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  
                  {/* サブ情報行 */}
                  {(detail.subAccountCode || detail.partnerCode || detail.analysisCode) && (
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      {detail.subAccountCode && (
                        <span>補助: {detail.subAccountCode}</span>
                      )}
                      {detail.partnerCode && (
                        <span>取引先: {detail.partnerCode}</span>
                      )}
                      {detail.analysisCode && (
                        <span>分析: {detail.analysisCode}</span>
                      )}
                    </div>
                  )}
                  
                  {/* 摘要 */}
                  {detail.lineDescription && (
                    <div className="text-xs text-slate-600 mt-0.5 bg-slate-50 px-1 py-0.5 rounded truncate">
                      {detail.lineDescription}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * 税区分のラベルを取得
 */
function getTaxTypeLabel(taxType: string): string {
  switch (taxType) {
    case "taxable":
      return "課税";
    case "non_taxable":
      return "対象外";
    case "tax_free":
      return "免税";
    case "tax_entry":
      return "税額";
    default:
      return taxType;
  }
}
