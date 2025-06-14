/**
 * 試算表レポートページ
 * ============================================================================
 * 勘定科目別残高の表示・印刷・CSV出力機能
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/accounting/date-range-picker";
import { ReportActionsButton } from "@/components/accounting/report-actions-button";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  getTrialBalanceData,
  getTrialBalanceSummary,
  TrialBalanceData,
  TrialBalanceParams,
} from "@/app/actions/trial-balance";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TrialBalanceTable } from "@/components/accounting/trial-balance-table";
import { generateTrialBalancePdfFromHtml } from "@/lib/exports/trial-balance-pdf";
import { generateTrialBalanceExcel } from "@/lib/exports/trial-balance-excel";

export default function TrialBalanceReportPage() {
  // 現在の日本時間の年を取得
  const currentYear = new Date().getFullYear();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    new Date(`${currentYear}-01-01`)
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    new Date(`${currentYear}-12-31`)
  );

  const [includeZeroBalance, setIncludeZeroBalance] = useState<boolean>(true);
  const [includeSubAccounts, setIncludeSubAccounts] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceData[]>(
    []
  );

  // 初期化時に自動検索
  useEffect(() => {
    const initialSearch = async () => {
      if (!dateFrom || !dateTo) return;

      try {
        const params: TrialBalanceParams = {
          dateFrom,
          dateTo,
          includeZeroBalance,
          includeSubAccounts,
        };

        const result = await getTrialBalanceData(params);

        if (result.success && result.data) {
          setTrialBalanceData(result.data);
        } else {
          // エラー時はモックデータを表示
          setTrialBalanceData([]);
        }
      } catch (error) {
        console.error("初期検索エラー:", error);
        setTrialBalanceData([]);
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
    setIncludeZeroBalance(true);
    setIncludeSubAccounts(true);
    toast.success("検索条件をクリアしました");
  };

  const handleSearch = async () => {
    if (!dateFrom || !dateTo) {
      toast.error("期間を指定してください");
      return;
    }

    setIsLoading(true);
    try {
      const params: TrialBalanceParams = {
        dateFrom,
        dateTo,
        includeZeroBalance,
        includeSubAccounts,
      };

      const result = await getTrialBalanceData(params);

      if (result.success && result.data) {
        setTrialBalanceData(result.data);

        if (result.data.length === 0) {
          toast.info("検索条件に該当するデータがありませんでした");
        } else {
          toast.success(`${result.data.length}件のデータを取得しました`);
        }
      } else {
        const errorMessage = result.error || "データの取得に失敗しました";
        toast.error(errorMessage);
        console.error("検索エラー詳細:", result);
        setTrialBalanceData([]);
      }
    } catch (error) {
      console.error("検索エラー:", error);
      toast.error("データの取得中にエラーが発生しました");
      setTrialBalanceData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // PDF出力機能
  const handleDownloadPdf = async () => {
    if (trialBalanceData.length === 0) {
      toast.error("出力するデータがありません");
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error("期間を指定してください");
      return;
    }

    try {
      toast.info("PDF出力を開始しています...");

      await generateTrialBalancePdfFromHtml("trial-balance-print", {
        dateFrom,
        dateTo,
        companyName: "株式会社サンプル",
        includeZeroBalance,
        includeSubAccounts,
      });

      toast.success("PDF出力が完了しました");
    } catch (error) {
      console.error("PDF出力エラー:", error);
      toast.error("PDF出力中にエラーが発生しました");
    }
  };

  // Excel出力機能
  const handleDownloadExcel = async () => {
    if (trialBalanceData.length === 0) {
      toast.error("出力するデータがありません");
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error("期間を指定してください");
      return;
    }

    try {
      toast.info("Excel出力を開始しています...");

      await generateTrialBalanceExcel({
        data: trialBalanceData,
        dateFrom,
        dateTo,
        companyName: "株式会社サンプル", // 実際の会社名に変更可能
        includeZeroBalance,
        includeSubAccounts,
      });

      toast.success("Excel出力が完了しました");
    } catch (error) {
      console.error("Excel出力エラー:", error);
      toast.error("Excel出力中にエラーが発生しました");
    }
  };

  // CSV出力機能
  const handleDownloadCsv = () => {
    if (trialBalanceData.length === 0) {
      toast.error("出力するデータがありません");
      return;
    }

    try {
      // CSVヘッダー
      const csvHeaders = [
        "勘定科目コード",
        "勘定科目名",
        "補助科目コード",
        "補助科目名",
        "期首残高",
        "借方計上額",
        "貸方計上額",
        "期末残高",
      ];

      // CSVデータ作成
      const csvData = [];
      csvData.push(csvHeaders.join(","));

      trialBalanceData.forEach((item) => {
        const row = [
          item.accountCode,
          `"${item.accountName}"`,
          item.subAccountCode || "",
          `"${item.subAccountName || ""}"`,
          item.openingBalance,
          item.debitAmount,
          item.creditAmount,
          item.closingBalance,
        ];
        csvData.push(row.join(","));
      });

      // ファイル名生成
      const fromStr = dateFrom
        ? format(dateFrom, "yyyyMMdd", { locale: ja })
        : "";
      const toStr = dateTo ? format(dateTo, "yyyyMMdd", { locale: ja }) : "";
      const filename = `試算表_${fromStr}-${toStr}_${format(
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
            <CardTitle>試算表</CardTitle>
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

            {/* 表示オプション */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-zero-balance"
                  checked={includeZeroBalance}
                  onCheckedChange={(checked: boolean) =>
                    setIncludeZeroBalance(checked)
                  }
                />
                <Label htmlFor="include-zero-balance">残高ゼロ科目を含む</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-sub-accounts"
                  checked={includeSubAccounts}
                  onCheckedChange={(checked: boolean) =>
                    setIncludeSubAccounts(checked)
                  }
                />
                <Label htmlFor="include-sub-accounts">補助科目を含む</Label>
              </div>
            </div>
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

            <ReportActionsButton
              onDownloadPdf={handleDownloadPdf}
              onDownloadExcel={handleDownloadExcel}
              onDownloadCsv={handleDownloadCsv}
            />
          </div>
        </CardContent>
      </Card>

      {/* 試算表表示 */}
      <Card
        className="print:shadow-none print:border-none"
        id="trial-balance-print"
      >
        <CardContent className="p-6 print:p-0">
          <div className="print:break-avoid">
            {/* 印刷用ヘッダー */}
            <div className="hidden print:block mb-4 text-center print:break-avoid">
              <h1 className="text-xl font-bold mb-1 print:text-lg">試 算 表</h1>
              <p className="text-xs print:text-xs">
                期間:{" "}
                {dateFrom
                  ? format(dateFrom, "yyyy年MM月dd日", { locale: ja })
                  : ""}{" "}
                ～{" "}
                {dateTo ? format(dateTo, "yyyy年MM月dd日", { locale: ja }) : ""}
              </p>
              <p className="text-xs print:text-xs mt-1">
                検索結果: {trialBalanceData.length}件
              </p>
            </div>

            {/* データ件数表示・ローディング */}
            <div className="mb-4 text-sm text-muted-foreground print:hidden flex justify-between items-center">
              <span>検索結果: {trialBalanceData.length}件</span>
              {isLoading && (
                <span className="text-primary animate-pulse">検索中...</span>
              )}
            </div>

            {/* 試算表テーブル */}
            <TrialBalanceTable
              data={trialBalanceData}
              showSubtotals={true}
              showGrandTotal={true}
            />

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
