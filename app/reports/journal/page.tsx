/**
 * 仕訳帳レポートページ（サンプル版）
 * ============================================================================
 * 仕訳帳の表示・印刷・PDF出力機能のサンプル実装
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/accounting/date-range-picker";
import { ReportActions } from "@/components/accounting/report-actions-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  getJournalLedgerData,
  JournalInquiryData,
} from "@/app/actions/journal-inquiry";
import { getTaxRates, type TaxRateForClient } from "@/app/actions/tax-rates";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function JournalReportPage() {
  // 現在の日本時間の年を取得
  const currentYear = new Date().getFullYear();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    new Date(`${currentYear}-01-01`)
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    new Date(`${currentYear}-12-31`)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [journalData, setJournalData] =
    useState<JournalInquiryData[]>([]);
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
        console.error("税区分マスタの取得に失敗:", error);
      }
    };

    loadTaxRates();
  }, []);

  // 初期化時に自動検索
  useEffect(() => {
    const initialSearch = async () => {
      try {
        const result = await getJournalLedgerData({
          dateFrom,
          dateTo,
        });

        if (result.success && result.data) {
          setJournalData(result.data);
        } else {
          // エラー時はモックデータを表示
          setJournalData([]);
        }
      } catch (error) {
        console.error("初期検索エラー:", error);
        // エラー時はモックデータを表示
        setJournalData([]);
      }
    };

    initialSearch();
  }, []);

  const handleDateRangeChange = (
    from: Date | undefined,
    to: Date | undefined
  ) => {
    setDateFrom(from);
    setDateTo(to);
  };

  // 検索条件クリア
  const handleClearFilters = () => {
    setDateFrom(new Date(`${currentYear}-01-01`));
    setDateTo(new Date(`${currentYear}-12-31`));
    toast.success("検索条件をクリアしました");
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const result = await getJournalLedgerData({
        dateFrom,
        dateTo,
      });

      if (result.success && result.data) {
        setJournalData(result.data);
        if (result.data.length === 0) {
          toast.info("検索条件に該当する仕訳がありませんでした");
        } else {
          toast.success(`${result.data.length}件の仕訳を取得しました`);
        }
      } else {
        const errorMessage = result.error || "データの取得に失敗しました";
        toast.error(errorMessage);
        console.error("検索エラー詳細:", result);
        // エラー時はモックデータを表示
        setJournalData([]);
      }
    } catch (error) {
      console.error("検索エラー:", error);
      toast.error("データの取得中にエラーが発生しました");
      // エラー時はモックデータを表示
      setJournalData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "0";
    }
    return amount.toLocaleString("ja-JP");
  };

  // 税区分名を取得するヘルパー関数
  const getTaxRateName = (taxCode: string | null) => {
    if (!taxCode) return "未設定";
    const taxRate = taxRates.find(rate => rate.taxCode === taxCode);
    return taxRate ? `${taxRate.taxName}(${taxRate.taxRate}%)` : taxCode;
  };

  // CSV出力機能
  const handleDownloadCsv = () => {
    if (journalData.length === 0) {
      toast.error("出力するデータがありません");
      return;
    }

    try {
      // CSVヘッダー
      const csvHeaders = [
        "日付",
        "仕訳番号",
        "伝票摘要",
        "行番号",
        "借貸",
        "勘定科目コード",
        "勘定科目名",
        "補助科目コード",
        "補助科目名",
        "取引先コード",
        "取引先名",
        "分析コード",
        "分析コード名",
        "基準金額",
        "税額",
        "合計金額",
        "税区分",
        "明細摘要",
      ];

      // CSVデータ作成
      const csvData = [];
      csvData.push(csvHeaders.join(","));

      journalData.forEach((journal) => {
        journal.details.forEach((detail) => {
          const row = [
            format(new Date(journal.journalDate), "yyyy/MM/dd", { locale: ja }),
            journal.journalNumber,
            `"${journal.description || ""}"`,
            detail.lineNumber,
            detail.debitCredit,
            detail.accountCode,
            `"${detail.accountName}"`,
            detail.subAccountCode || "",
            `"${detail.subAccountName || ""}"`,
            detail.partnerCode || "",
            `"${detail.partnerName || ""}"`,
            detail.analysisCode || "",
            `"${detail.analysisCodeName || ""}"`,
            detail.baseAmount || 0,
            detail.taxAmount || 0,
            detail.totalAmount || 0,
            `"${getTaxRateName(detail.taxCode)}"`,
            `"${detail.lineDescription || ""}"`,
          ];
          csvData.push(row.join(","));
        });
      });

      // ファイル名生成
      const fromStr = dateFrom
        ? format(dateFrom, "yyyyMMdd", { locale: ja })
        : "";
      const toStr = dateTo ? format(dateTo, "yyyyMMdd", { locale: ja }) : "";
      const filename = `仕訳検索_${fromStr}-${toStr}_${format(
        new Date(),
        "yyyyMMdd_HHmmss",
        { locale: ja }
      )}.csv`;

      // CSVダウンロード
      const csvContent = csvData.join("\n");
      const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`CSV出力が完了しました: ${filename}`);
      }
    } catch (error) {
      console.error("CSV出力エラー:", error);
      toast.error("CSV出力中にエラーが発生しました");
    }
  };

  return (
    <div className="space-y-6 print:full-width">
      {/* 検索条件 */}
      <Card className="print:hide-search">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>仕訳検索</CardTitle>
            <div className="text-sm text-muted-foreground">
              {dateFrom && dateTo && (
                <span>
                  {format(dateFrom, "yyyy/MM/dd", { locale: ja })} ～{" "}
                  {format(dateTo, "yyyy/MM/dd", { locale: ja })}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onRangeChange={handleDateRangeChange}
            />

          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "検索中..." : "検索"}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={isLoading}
              >
                クリア
              </Button>
            </div>

            <ReportActions
              onDownloadPdf={() => alert("PDF出力機能は実装予定です")}
              onDownloadExcel={handleDownloadCsv}
            />
          </div>
        </CardContent>
      </Card>

      {/* 仕訳帳表示 */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-6 print:p-0">
          <div className="print:break-avoid">
            {/* 印刷用ヘッダー */}
            <div className="hidden print:block mb-4 text-center print:break-avoid">
              <h1 className="text-xl font-bold mb-1 print:text-lg">仕 訳 検 索</h1>
              <p className="text-xs print:text-xs">
                期間:{" "}
                {dateFrom
                  ? format(dateFrom, "yyyy年MM月dd日", { locale: ja })
                  : ""}{" "}
                ～{" "}
                {dateTo ? format(dateTo, "yyyy年MM月dd日", { locale: ja }) : ""}
              </p>
              <p className="text-xs print:text-xs mt-1">
                検索結果: {journalData.length}件
              </p>
            </div>

            {/* データ件数表示・ローディング */}
            <div className="mb-4 text-sm text-muted-foreground print:hidden flex justify-between items-center">
              <span>検索結果: {journalData.length}件の仕訳</span>
              {isLoading && (
                <span className="text-primary animate-pulse">検索中...</span>
              )}
            </div>

            {/* Shadcn/UI Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-20 print:w-auto">
                      日付
                    </TableHead>
                    <TableHead className="text-center w-32 print:w-auto">
                      仕訳番号
                    </TableHead>
                    <TableHead className="text-center w-32 print:w-auto">
                      伝票摘要
                    </TableHead>
                    <TableHead className="text-center w-12 print:w-auto">
                      行
                    </TableHead>
                    <TableHead className="text-center w-12 print:w-auto">
                      借貸
                    </TableHead>
                    <TableHead className="text-center w-16 print:w-auto">
                      科目
                    </TableHead>
                    <TableHead className="text-center w-32 print:w-auto">
                      勘定科目名
                    </TableHead>
                    <TableHead className="text-center w-16 print:w-auto">
                      補助
                    </TableHead>
                    <TableHead className="text-center w-32 print:w-auto">
                      取引先
                    </TableHead>
                    <TableHead className="text-center w-24 print:w-auto">
                      金額
                    </TableHead>
                    <TableHead className="text-center w-20 print:w-auto">
                      税区分
                    </TableHead>
                    <TableHead className="text-center print:w-auto">
                      明細摘要
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="text-center py-8 text-muted-foreground"
                      >
                        検索条件に該当する仕訳データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    journalData.map((journal) =>
                      journal.details.map((detail, index) => (
                        <TableRow
                          key={`${journal.journalNumber}-${detail.lineNumber}`}
                        >
                          {/* 日付・仕訳番号・伝票摘要は最初の行のみ表示 */}
                          {index === 0 && (
                            <>
                              <TableCell
                                className="text-center align-top border-r"
                                rowSpan={journal.details.length}
                              >
                                {format(
                                  new Date(journal.journalDate),
                                  "MM/dd",
                                  { locale: ja }
                                )}
                              </TableCell>
                              <TableCell
                                className="text-center align-top border-r text-xs"
                                rowSpan={journal.details.length}
                              >
                                {journal.journalNumber}
                              </TableCell>
                              <TableCell
                                className="align-top border-r"
                                rowSpan={journal.details.length}
                              >
                                {journal.description}
                              </TableCell>
                            </>
                          )}

                          <TableCell className="text-center border-r">
                            {detail.lineNumber}
                          </TableCell>
                          <TableCell className="text-center border-r">
                            {detail.debitCredit === "D" ? "借" : "貸"}
                          </TableCell>
                          <TableCell className="text-center border-r">
                            {detail.accountCode}
                          </TableCell>
                          <TableCell className="border-r">
                            {detail.accountName}
                          </TableCell>
                          <TableCell className="text-center border-r">
                            {detail.subAccountCode || ""}
                          </TableCell>
                          <TableCell className="border-r">
                            {detail.partnerName || ""}
                          </TableCell>
                          <TableCell className="text-right border-r">
                            ¥{formatAmount(detail.totalAmount)}
                          </TableCell>
                          <TableCell className="text-center border-r text-xs">
                            {getTaxRateName(detail.taxCode)}
                          </TableCell>
                          <TableCell>{detail.lineDescription || ""}</TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 印刷用フッター */}
            <div className="hidden print:block mt-4 text-center print:break-avoid">
              <p className="text-xs print:text-xs">
                印刷日時:{" "}
                {format(new Date(), "yyyy年MM月dd日 HH:mm", { locale: ja })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
