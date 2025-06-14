/**
 * レポート操作ボタン
 * ============================================================================
 * 印刷・PDF出力・Excel出力等の共通操作ボタン
 * ============================================================================
 */

"use client";

import { Button } from "@/components/ui/button";
import { Printer, Download, FileText } from "lucide-react";

interface ReportActionsProps {
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onDownloadExcel?: () => void;
  onDownloadCsv?: () => void;
  className?: string;
}

export function ReportActionsButton({
  onPrint,
  onDownloadPdf,
  onDownloadExcel,
  onDownloadCsv,
  className = "",
}: ReportActionsProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        印刷
      </Button>

      {onDownloadPdf && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadPdf}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          PDF出力
        </Button>
      )}

      {onDownloadExcel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadExcel}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Excel出力
        </Button>
      )}

      {onDownloadCsv && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadCsv}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          CSV出力
        </Button>
      )}
    </div>
  );
}
