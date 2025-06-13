/**
 * 仕訳明細照会コンポーネント
 * ============================================================================
 * 照会用の読み取り専用明細表示フォーム
 * ============================================================================
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JournalDetailInquiryData } from "@/app/actions/journal-inquiry";
import { Label } from "@/components/ui/label";

interface JournalDetailInquiryProps {
  type: "debit" | "credit";
  detail: JournalDetailInquiryData | null;
  className?: string;
}

export function JournalDetailInquiry({
  type,
  detail,
  className,
}: JournalDetailInquiryProps) {
  const isDebit = type === "debit";
  const title = isDebit ? "借方明細" : "貸方明細";
  const bgColor = "bg-slate-50";
  const borderColor = "border-slate-200";

  if (!detail) {
    return (
      <Card className={cn("h-fit border-2 transition-all duration-200", borderColor, bgColor, className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-700">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-8 text-muted-foreground">
            {type === "debit" ? "借方" : "貸方"}明細がありません
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-fit border-2 transition-all duration-200", borderColor, bgColor, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-700">
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={"secondary"} className="text-xs">
              {isDebit ? "借方" : "貸方"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              行 {detail.lineNumber}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 勘定科目 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            勘定科目 *
          </Label>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-20 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm font-mono flex items-center">
              {detail.accountCode}
            </div>
            <div className="flex-1 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm flex items-center">
              {detail.accountName}
            </div>
          </div>
        </div>

        {/* 補助科目 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            補助科目
          </Label>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-20 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm font-mono flex items-center">
              {detail.subAccountCode || "―"}
            </div>
            <div className="flex-1 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm flex items-center">
              {detail.subAccountName || "―"}
            </div>
          </div>
        </div>

        {/* 取引先 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            取引先
          </Label>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-20 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm font-mono flex items-center">
              {detail.partnerCode || "―"}
            </div>
            <div className="flex-1 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm flex items-center">
              {detail.partnerName || "―"}
            </div>
          </div>
        </div>

        {/* 分析コード */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            分析コード
          </Label>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-20 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm font-mono flex items-center">
              {detail.analysisCode || "―"}
            </div>
            <div className="flex-1 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm flex items-center">
              {detail.analysisCodeName || "―"}
            </div>
          </div>
        </div>

        {/* 課税区分 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            課税区分
          </Label>
          <div className="w-40">
            <div className="h-10 px-3 py-2 border border-input bg-background rounded-md text-sm flex items-center">
              {getTaxTypeLabel(detail.taxType)}
            </div>
          </div>
        </div>

        {/* 金額（本体額 + 消費税額） */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            金額 *
          </Label>
          <div className="flex-1 flex gap-2">
            {/* 本体額 */}
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">本体額</div>
              <div className="h-9 px-3 border border-input bg-background text-right font-mono text-sm rounded-md flex items-center justify-end">
                ¥{detail.baseAmount.toLocaleString()}
              </div>
            </div>

            {/* 消費税額 */}
            <div className="w-24">
              <div className="text-xs text-gray-600 mb-1">消費税</div>
              <div className="h-9 px-3 border border-input bg-gray-50 text-right font-mono text-sm rounded-md flex items-center justify-end">
                ¥{detail.taxAmount.toLocaleString()}
              </div>
            </div>

            {/* 合計額 */}
            <div className="w-32">
              <div className="text-xs text-gray-600 mb-1">合計</div>
              <div className="h-9 px-3 border-2 border-blue-200 bg-blue-50 text-right font-mono text-sm font-semibold rounded-md flex items-center justify-end">
                ¥{detail.totalAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 摘要 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            摘要
          </Label>
          <div className="flex-1">
            <div className="h-10 px-3 py-2 border border-input bg-background rounded-md text-sm flex items-center">
              {detail.lineDescription || "―"}
            </div>
          </div>
        </div>
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
