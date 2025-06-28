/**
 * 仕訳明細表示コンポーネント（照会用）
 * ============================================================================
 * 仕訳明細データを読み取り専用で表示
 * ============================================================================
 */

"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { JournalDetailInquiryData } from "@/app/actions/journal-inquiry";
import { useState, useEffect } from "react";
import { getTaxRates } from "@/app/actions/tax-rates";
import type { TaxRateForClient } from "@/types/unified";

interface JournalDetailViewProps {
  details: JournalDetailInquiryData[];
}

export function JournalDetailView({ details }: JournalDetailViewProps) {
  const [taxRates, setTaxRates] = useState<TaxRateForClient[]>([]);

  // 税区分マスタを取得
  useEffect(() => {
    const loadTaxRates = async () => {
      try {
        const result = await getTaxRates();
        if (result.success && result.data) {
          setTaxRates(result.data);
        }
      } catch (error) {
        console.error("税区分の取得に失敗:", error);
      }
    };

    loadTaxRates();
  }, []);

  // 税区分名を取得するヘルパー関数
  const getTaxRateName = (taxCode: string | null) => {
    if (!taxCode) return "未設定";
    const taxRate = taxRates.find(rate => rate.taxCode === taxCode);
    return taxRate ? `${taxRate.taxName} (${taxRate.taxRate}%)` : taxCode;
  };

  if (!details || details.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        明細データがありません
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">行</TableHead>
            <TableHead className="w-20">借/貸</TableHead>
            <TableHead>勘定科目</TableHead>
            <TableHead>補助科目</TableHead>
            <TableHead>取引先</TableHead>
            <TableHead>分析コード</TableHead>
            <TableHead>計上部門</TableHead>
            <TableHead className="text-right">本体額</TableHead>
            <TableHead className="text-right">税額</TableHead>
            <TableHead className="text-right">合計額</TableHead>
            <TableHead>税区分</TableHead>
            <TableHead>摘要</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {details.map((detail) => (
            <TableRow key={detail.lineNumber}>
              <TableCell className="font-mono text-center">
                {detail.lineNumber}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={detail.debitCredit === "D" ? "default" : "secondary"}
                  className="w-12 justify-center"
                >
                  {detail.debitCredit === "D" ? "借方" : "貸方"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-mono text-sm text-muted-foreground">
                    {detail.accountCode}
                  </div>
                  <div className="font-medium">{detail.accountName}</div>
                </div>
              </TableCell>
              <TableCell>
                {detail.subAccountCode ? (
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-muted-foreground">
                      {detail.subAccountCode}
                    </div>
                    <div className="text-sm">{detail.subAccountName}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {detail.partnerCode ? (
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-muted-foreground">
                      {detail.partnerCode}
                    </div>
                    <div className="text-sm">{detail.partnerName}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {detail.analysisCode ? (
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-muted-foreground">
                      {detail.analysisCode}
                    </div>
                    <div className="text-sm">{detail.analysisCodeName}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {detail.departmentCode ? (
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-muted-foreground">
                      {detail.departmentCode}
                    </div>
                    <div className="text-sm">{detail.departmentName}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">
                ¥{detail.baseAmount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono">
                {detail.taxAmount > 0 ? (
                  `¥${detail.taxAmount.toLocaleString()}`
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                ¥{detail.totalAmount.toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {getTaxRateName(detail.taxCode)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                {detail.lineDescription ? (
                  <span className="text-sm">{detail.lineDescription}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

