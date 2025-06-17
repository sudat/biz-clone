/**
 * 仕訳明細リストコンポーネント
 * ============================================================================
 * 追加された明細の表示・削除機能
 * ============================================================================
 */

"use client";

import React from "react";
import { Trash2, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalDetailData } from "@/types/journal";

interface JournalDetailListProps {
  type: 'debit' | 'credit';
  details: JournalDetailData[];
  onRemove: (index: number) => void;
  onDetailClick?: (detail: JournalDetailData) => void;
  selectedDetail?: JournalDetailData | null;
  total: number;
  disabled?: boolean;
  className?: string;
}

const TYPE_CONFIG = {
  debit: {
    title: '借方',
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    itemBgColor: 'bg-slate-25',
    itemBorderColor: 'border-slate-100'
  },
  credit: {
    title: '貸方',
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200', 
    itemBgColor: 'bg-slate-25',
    itemBorderColor: 'border-slate-100'
  }
} as const;

// 通貨フォーマット
const formatCurrency = (amount: number): string => {
  if (amount === 0) return "―";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(amount);
};

export function JournalDetailList({
  type,
  details,
  onRemove,
  onDetailClick,
  selectedDetail,
  total,
  disabled = false,
  className
}: JournalDetailListProps) {
  const config = TYPE_CONFIG[type];
  const filteredDetails = details.filter(detail => detail.debitCredit === type);

  return (
    <Card className={cn(
      "border-2 h-full flex flex-col",
      config.borderColor,
      config.bgColor,
      className
    )}>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              type === 'debit' ? 'bg-slate-500' : 'bg-slate-600'
            )} />
            <span className="text-lg font-semibold text-black">
              {config.title}
            </span>
          </div>
          {total > 0 && (
            <Badge 
              variant="secondary" 
              className="text-base font-mono px-3 py-1 bg-slate-100 text-black"
            >
              {formatCurrency(total)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-1 min-h-[200px]">
          {filteredDetails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="h-6 w-6 mb-2 opacity-50" />
              <span className="text-xs">
                {config.title}の明細がありません
              </span>
            </div>
          ) : (
            filteredDetails.map((detail, index) => {
              const isSelected = selectedDetail === detail;
              return (
                <div
                  key={`${type}-${index}`}
                  onClick={() => onDetailClick?.(detail)}
                  className={cn(
                    "p-1.5 rounded border transition-all duration-200 cursor-pointer",
                    isSelected 
                      ? "bg-blue-100 border-blue-300 shadow-sm" 
                      : "bg-white/50 hover:bg-white/80 hover:border-slate-300",
                    config.itemBorderColor,
                    "group"
                  )}
                >
              
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    {/* メイン行：勘定科目 + 金額 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-black text-sm">
                          {detail.accountCode}
                        </span>
                        {detail.accountName && (
                          <span className="text-xs text-black truncate">
                            {detail.accountName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-sm font-mono font-semibold text-black">
                          {formatCurrency(detail.totalAmount)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(details.indexOf(detail))}
                          disabled={disabled}
                          className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0",
                            "hover:bg-red-50 hover:text-red-600"
                          )}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* サブ情報行 */}
                    {(detail.subAccountCode || detail.partnerCode || detail.analysisCode) && (
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-black">
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
                    {detail.description && (
                      <div className="text-xs text-black mt-0.5 bg-slate-50 px-1 py-0.5 rounded truncate">
                        {detail.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
        
        {/* 明細数表示 */}
        {filteredDetails.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-black text-center">
              {filteredDetails.length}件の明細
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}