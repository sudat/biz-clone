/**
 * 勘定照合レポートページ
 * ============================================================================
 * 勘定照合マスタをベースに指定期間の仕訳データを集計・照合差額を表示
 * ============================================================================
 */

"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/accounting/date-range-picker";
import { ReportActionsButton } from "@/components/accounting/report-actions-button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AmountDisplay,
  BalanceAmount,
} from "@/components/accounting/amount-display";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  getReconciliationReportData,
  getReconciliationReportSummary,
  ReconciliationReportData,
  ReconciliationReportParams,
} from "@/app/actions/reconciliation-report";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ReconciliationReportPage() {
  const router = useRouter();

  // 現在の日本時間の年を取得
  const currentYear = new Date().getFullYear();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    new Date(`${currentYear}-01-01`)
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    new Date(`${currentYear}-12-31`)
  );

  const [includeMatched, setIncludeMatched] = useState<boolean>(true);
  const [includeUnmatched, setIncludeUnmatched] = useState<boolean>(true);
  const [includePending, setIncludePending] = useState<boolean>(false);
  const [includeApproved, setIncludeApproved] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();
  const [reconciliationData, setReconciliationData] = useState<
    ReconciliationReportData[]
  >([]);
  const [summary, setSummary] = useState<{
    totalMappings: number;
    matchedMappings: number;
    unmatchedMappings: number;
    totalPrimaryAmount: number;
    totalCounterAmount: number;
    totalDifference: number;
    matchRate: number;
  } | null>(null);

  // 初期化時に自動検索
  useEffect(() => {
    const initialSearch = async () => {
      if (!dateFrom || !dateTo) return;

      try {
        const params: ReconciliationReportParams = {
          dateFrom,
          dateTo,
          includeMatched,
          includeUnmatched,
          approvalStatuses: buildApprovalArray(),
        };

        const result = await getReconciliationReportData(params);

        if (result.success && result.data) {
          setReconciliationData(result.data);
          const summaryData = await getReconciliationReportSummary(result.data);
          setSummary(summaryData);
        } else {
          setReconciliationData([]);
          setSummary(null);
        }
      } catch (error) {
        console.error("初期検索エラー:", error);
        setReconciliationData([]);
        setSummary(null);
      }
    };

    initialSearch();
  }, [
    dateFrom,
    dateTo,
    includeMatched,
    includeUnmatched,
    includePending,
    includeApproved,
  ]);

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
    setIncludeMatched(true);
    setIncludeUnmatched(true);
    setIncludePending(false);
    setIncludeApproved(true);
    toast.success("検索条件をクリアしました");
  };

  const handleSearch = async () => {
    if (!dateFrom || !dateTo) {
      toast.error("期間を指定してください");
      return;
    }

    const params: ReconciliationReportParams = {
      dateFrom,
      dateTo,
      includeMatched,
      includeUnmatched,
      approvalStatuses: buildApprovalArray(),
    };

    const promise = getReconciliationReportData(params);

    toast.promise(promise, {
      loading: "検索中...",
      success: (result) => {
        if (result.success && result.data) {
          if (result.data.length === 0) {
            return "検索条件に該当するデータがありませんでした";
          } else {
            return `${result.data.length}パターンの照合結果を取得しました`;
          }
        }
        return "データを取得しました";
      },
      error: "データの取得に失敗しました",
    });

    startTransition(async () => {
      try {
        const result = await promise;

        if (result.success && result.data) {
          setReconciliationData(result.data);
          const summaryData = await getReconciliationReportSummary(result.data);
          setSummary(summaryData);
        } else {
          console.error("検索エラー詳細:", result);
          setReconciliationData([]);
          setSummary(null);
        }
      } catch (error) {
        console.error("検索エラー:", error);
        setReconciliationData([]);
        setSummary(null);
      }
    });
  };

  // 明細画面への遷移
  const handleViewDetails = (mappingId: string) => {
    const fromStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : "";
    const toStr = dateTo ? format(dateTo, "yyyy-MM-dd") : "";
    router.push(
      `/reports/reconciliation/detail?mappingId=${mappingId}&dateFrom=${fromStr}&dateTo=${toStr}`
    );
  };

  // PDF出力機能（仮実装）
  const handleDownloadPdf = async () => {
    if (reconciliationData.length === 0) {
      toast.error("出力するデータがありません");
      return;
    }
    toast.info("PDF出力機能は準備中です");
  };

  // Excel出力機能（仮実装）
  const handleDownloadExcel = async () => {
    if (reconciliationData.length === 0) {
      toast.error("出力するデータがありません");
      return;
    }
    toast.info("Excel出力機能は準備中です");
  };

  // CSV出力機能
  const handleDownloadCsv = () => {
    if (reconciliationData.length === 0) {
      toast.error("出力するデータがありません");
      return;
    }

    try {
      // CSVヘッダー
      const csvHeaders = [
        "計上部門コード",
        "計上部門名",
        "勘定科目コード",
        "勘定科目名",
        "借方計上額",
        "貸方計上額",
        "純額",
        "相手計上部門コード",
        "相手計上部門名",
        "相手勘定科目コード",
        "相手勘定科目名",
        "相手借方計上額",
        "相手貸方計上額",
        "相手純額",
        "差額",
        "照合状況",
        "摘要",
      ];

      // CSVデータ作成
      const csvData = [];
      csvData.push(csvHeaders.join(","));

      reconciliationData.forEach((item) => {
        const row = [
          item.departmentCode,
          `"${item.departmentName}"`,
          item.accountCode,
          `"${item.accountName}"`,
          item.primaryDebitAmount,
          item.primaryCreditAmount,
          item.primaryNetAmount,
          item.counterDepartmentCode,
          `"${item.counterDepartmentName}"`,
          item.counterAccountCode,
          `"${item.counterAccountName}"`,
          item.counterDebitAmount,
          item.counterCreditAmount,
          item.counterNetAmount,
          item.difference,
          item.isMatched ? "一致" : "不一致",
          `"${item.description || ""}"`,
        ];
        csvData.push(row.join(","));
      });

      // ファイル名生成
      const fromStr = dateFrom
        ? format(dateFrom, "yyyyMMdd", { locale: ja })
        : "";
      const toStr = dateTo ? format(dateTo, "yyyyMMdd", { locale: ja }) : "";
      const filename = `勘定照合レポート_${fromStr}-${toStr}_${format(
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

  const buildApprovalArray = (): ("pending" | "approved")[] => {
    const arr: ("pending" | "approved")[] = [];
    if (includePending) arr.push("pending");
    if (includeApproved) arr.push("approved");
    return arr;
  };

  return (
    <div className="space-y-6 print:full-width">
      {/* 検索条件 */}
      <Card className="print:hide-search">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>勘定照合レポート</CardTitle>
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

            {/* 検索オプション */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-matched"
                  checked={includeMatched}
                  onCheckedChange={(checked: boolean) =>
                    setIncludeMatched(checked)
                  }
                />
                <Label htmlFor="include-matched">照合一致分を含む</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-unmatched"
                  checked={includeUnmatched}
                  onCheckedChange={(checked: boolean) =>
                    setIncludeUnmatched(checked)
                  }
                />
                <Label htmlFor="include-unmatched">照合不一致分を含む</Label>
              </div>
              {/* 承認ステータス */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approval-pending"
                  checked={includePending}
                  onCheckedChange={(checked: boolean) =>
                    setIncludePending(checked)
                  }
                />
                <Label htmlFor="approval-pending">承認中</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approval-approved"
                  checked={includeApproved}
                  onCheckedChange={(checked: boolean) =>
                    setIncludeApproved(checked)
                  }
                />
                <Label htmlFor="approval-approved">承認済</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={isPending}>
                {isPending ? "検索中..." : "検索"}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={isPending}
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

      {/* サマリー情報 */}
      {summary && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">照合対象</div>
                <div className="font-semibold">{summary.totalMappings}パターン</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">照合一致</div>
                <div className="font-semibold text-green-600">
                  {summary.matchedMappings}パターン
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">照合不一致</div>
                <div className="font-semibold text-red-600">
                  {summary.unmatchedMappings}パターン
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">照合率</div>
                <div className="font-semibold">
                  {summary.matchRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 勘定照合レポート表示 */}
      <Card
        className="print:shadow-none print:border-none"
        id="reconciliation-report-print"
      >
        <CardContent className="p-6 print:p-0">
          <div className="print:break-avoid">
            {/* 印刷用ヘッダー */}
            <div className="hidden print:block mb-4 text-center print:break-avoid">
              <h1 className="text-xl font-bold mb-1 print:text-lg">
                勘定照合レポート
              </h1>
              <p className="text-xs print:text-xs">
                期間:{" "}
                {dateFrom
                  ? format(dateFrom, "yyyy年MM月dd日", { locale: ja })
                  : ""}{" "}
                ～{" "}
                {dateTo ? format(dateTo, "yyyy年MM月dd日", { locale: ja }) : ""}
              </p>
              <p className="text-xs print:text-xs mt-1">
                検索結果: {reconciliationData.length}パターン
              </p>
            </div>

            {/* データ件数表示 */}
            <div className="mb-4 text-sm text-muted-foreground print:hidden">
              <span>検索結果: {reconciliationData.length}パターン</span>
            </div>

            {/* 勘定照合テーブル */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-24">計上部門</TableHead>
                    <TableHead className="text-center w-32">勘定科目</TableHead>
                    <TableHead className="text-center w-24">
                      借方計上額
                    </TableHead>
                    <TableHead className="text-center w-24">
                      貸方計上額
                    </TableHead>
                    <TableHead className="text-center w-24">純額</TableHead>
                    <TableHead className="text-center w-24">
                      相手計上部門
                    </TableHead>
                    <TableHead className="text-center w-32">
                      相手勘定科目
                    </TableHead>
                    <TableHead className="text-center w-24">
                      相手借方額
                    </TableHead>
                    <TableHead className="text-center w-24">
                      相手貸方額
                    </TableHead>
                    <TableHead className="text-center w-24">相手純額</TableHead>
                    <TableHead className="text-center w-20">差額</TableHead>
                    <TableHead className="text-center w-16">状況</TableHead>
                    <TableHead className="text-center w-16 print:hidden">
                      照会
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        className="text-center py-8 text-muted-foreground"
                      >
                        検索条件に該当するデータがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    reconciliationData.map((item, index) => (
                      <TableRow key={`${item.mappingId}-${index}`}>
                        <TableCell className="text-center border-r">
                          <div className="font-mono text-xs">
                            {item.departmentCode}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.departmentName}
                          </div>
                        </TableCell>
                        <TableCell className="border-r">
                          <div className="font-mono text-xs">
                            {item.accountCode}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.accountName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right border-r">
                          <AmountDisplay
                            amount={item.primaryDebitAmount}
                            showCurrency={false}
                            monospace={true}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right border-r">
                          <AmountDisplay
                            amount={item.primaryCreditAmount}
                            showCurrency={false}
                            monospace={true}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right border-r">
                          <BalanceAmount
                            amount={item.primaryNetAmount}
                            showCurrency={false}
                            monospace={true}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-center border-r">
                          <div className="font-mono text-xs">
                            {item.counterDepartmentCode}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.counterDepartmentName}
                          </div>
                        </TableCell>
                        <TableCell className="border-r">
                          <div className="font-mono text-xs">
                            {item.counterAccountCode}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.counterAccountName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right border-r">
                          <AmountDisplay
                            amount={item.counterDebitAmount}
                            showCurrency={false}
                            monospace={true}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right border-r">
                          <AmountDisplay
                            amount={item.counterCreditAmount}
                            showCurrency={false}
                            monospace={true}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right border-r">
                          <BalanceAmount
                            amount={item.counterNetAmount}
                            showCurrency={false}
                            monospace={true}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right border-r">
                          <BalanceAmount
                            amount={item.difference}
                            showCurrency={false}
                            monospace={true}
                            className={`text-xs ${
                              item.difference !== 0
                                ? "text-red-600 font-semibold"
                                : "text-green-600"
                            }`}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r">
                          <Badge
                            variant={
                              item.isMatched ? "secondary" : "destructive"
                            }
                            className="text-xs"
                          >
                            {item.isMatched ? "一致" : "不一致"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(item.mappingId)}
                            className="h-8 w-8 p-0 cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
