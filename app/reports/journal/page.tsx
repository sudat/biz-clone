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
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// モックデータ
const mockJournalData = [
  {
    journalNumber: "20241201000001",
    journalDate: new Date("2024-12-01"),
    description: "売上代金の入金",
    details: [
      {
        lineNumber: 1,
        debitCredit: "借方",
        accountCode: "111",
        accountName: "現金",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: "C001",
        partnerName: "株式会社ABC商事",
        analysisCode: "001",
        analysisCodeName: "営業部",
        amount: 110000,
        taxAmount: 10000,
        lineDescription: "商品売上",
      },
      {
        lineNumber: 2,
        debitCredit: "貸方",
        accountCode: "401",
        accountName: "売上高",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: null,
        partnerName: null,
        analysisCode: "001",
        analysisCodeName: "営業部",
        amount: 100000,
        taxAmount: 0,
        lineDescription: "商品売上",
      },
      {
        lineNumber: 3,
        debitCredit: "貸方",
        accountCode: "215",
        accountName: "仮受消費税",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: null,
        partnerName: null,
        analysisCode: null,
        analysisCodeName: null,
        amount: 10000,
        taxAmount: 0,
        lineDescription: "消費税",
      },
    ],
  },
  {
    journalNumber: "20241202000001",
    journalDate: new Date("2024-12-02"),
    description: "事務用品の購入",
    details: [
      {
        lineNumber: 1,
        debitCredit: "借方",
        accountCode: "621",
        accountName: "事務用品費",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: "V001",
        partnerName: "オフィス用品株式会社",
        analysisCode: "002",
        analysisCodeName: "総務部",
        amount: 5500,
        taxAmount: 500,
        lineDescription: "コピー用紙等",
      },
      {
        lineNumber: 2,
        debitCredit: "借方",
        accountCode: "212",
        accountName: "仮払消費税",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: null,
        partnerName: null,
        analysisCode: null,
        analysisCodeName: null,
        amount: 500,
        taxAmount: 0,
        lineDescription: "消費税",
      },
      {
        lineNumber: 3,
        debitCredit: "貸方",
        accountCode: "111",
        accountName: "現金",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: null,
        partnerName: null,
        analysisCode: null,
        analysisCodeName: null,
        amount: 6000,
        taxAmount: 0,
        lineDescription: "現金支払",
      },
    ],
  },
  {
    journalNumber: "20241203000001",
    journalDate: new Date("2024-12-03"),
    description: "給与の支払い",
    details: [
      {
        lineNumber: 1,
        debitCredit: "借方",
        accountCode: "613",
        accountName: "給与手当",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: null,
        partnerName: null,
        analysisCode: "001",
        analysisCodeName: "営業部",
        amount: 300000,
        taxAmount: 0,
        lineDescription: "12月分給与",
      },
      {
        lineNumber: 2,
        debitCredit: "貸方",
        accountCode: "211",
        accountName: "預り金",
        subAccountCode: "TAX",
        subAccountName: "所得税",
        partnerCode: null,
        partnerName: null,
        analysisCode: null,
        analysisCodeName: null,
        amount: 25000,
        taxAmount: 0,
        lineDescription: "源泉所得税",
      },
      {
        lineNumber: 3,
        debitCredit: "貸方",
        accountCode: "211",
        accountName: "預り金",
        subAccountCode: "SOC",
        subAccountName: "社会保険料",
        partnerCode: null,
        partnerName: null,
        analysisCode: null,
        analysisCodeName: null,
        amount: 45000,
        taxAmount: 0,
        lineDescription: "社会保険料",
      },
      {
        lineNumber: 4,
        debitCredit: "貸方",
        accountCode: "112",
        accountName: "普通預金",
        subAccountCode: null,
        subAccountName: null,
        partnerCode: "B001",
        partnerName: "○○銀行",
        analysisCode: null,
        analysisCodeName: null,
        amount: 230000,
        taxAmount: 0,
        lineDescription: "給与振込",
      },
    ],
  },
];

export default function JournalReportPage() {
  // 現在の日本時間の年を取得
  const currentYear = new Date().getFullYear();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    new Date(`${currentYear}-01-01`)
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    new Date(`${currentYear}-12-31`)
  );
  const [accountCode, setAccountCode] = useState<string>("");
  const [partnerCode, setPartnerCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalData, setJournalData] =
    useState<JournalInquiryData[]>(mockJournalData);

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
          setJournalData(mockJournalData);
        }
      } catch (error) {
        console.error("初期検索エラー:", error);
        // エラー時はモックデータを表示
        setJournalData(mockJournalData);
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
    setAccountCode("");
    setPartnerCode("");
    toast.success("検索条件をクリアしました");
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const result = await getJournalLedgerData({
        dateFrom,
        dateTo,
        accountCode: accountCode || undefined,
        partnerCode: partnerCode || undefined,
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
        setJournalData(mockJournalData);
      }
    } catch (error) {
      console.error("検索エラー:", error);
      toast.error("データの取得中にエラーが発生しました");
      // エラー時はモックデータを表示
      setJournalData(mockJournalData);
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
        "税率",
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
            detail.taxRate || "",
            detail.taxType,
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
      const filename = `仕訳帳_${fromStr}-${toStr}_${format(
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
            <CardTitle>仕訳帳</CardTitle>
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

            {/* フィルタ条件 */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-code">勘定科目コード</Label>
                <Input
                  id="account-code"
                  placeholder="例: 111"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-code">取引先コード</Label>
                <Input
                  id="partner-code"
                  placeholder="例: C001"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  className="w-32"
                />
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
              <h1 className="text-xl font-bold mb-1 print:text-lg">仕 訳 帳</h1>
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
                    <TableHead className="text-center print:w-auto">
                      明細摘要
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
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
