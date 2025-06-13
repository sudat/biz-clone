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

interface JournalDetailViewProps {
  details: JournalDetailInquiryData[];
}

export function JournalDetailView({ details }: JournalDetailViewProps) {
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
                    {getTaxTypeLabel(detail.taxType)}
                  </Badge>
                  {detail.taxRate && detail.taxRate > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {detail.taxRate}%
                    </div>
                  )}
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