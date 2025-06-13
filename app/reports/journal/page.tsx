/**
 * 仕訳帳レポートページ（サンプル版）
 * ============================================================================
 * 仕訳帳の表示・印刷・PDF出力機能のサンプル実装
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/accounting/date-range-picker";
import { ReportActions } from "@/components/accounting/report-actions";
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
import { getJournalLedgerData, JournalInquiryData } from "@/app/actions/journal-inquiry";
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
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date("2024-12-01"));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date("2024-12-31"));
  const [accountCode, setAccountCode] = useState<string>("");
  const [partnerCode, setPartnerCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalData, setJournalData] = useState<JournalInquiryData[]>(mockJournalData);

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setDateFrom(from);
    setDateTo(to);
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
        toast.success(`${result.data.length}件の仕訳を取得しました`);
      } else {
        toast.error(result.error || "データの取得に失敗しました");
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
    return amount.toLocaleString("ja-JP");
  };

  return (
    <div className="space-y-6">
      {/* 検索条件 */}
      <Card>
        <CardHeader>
          <CardTitle>仕訳帳</CardTitle>
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
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "検索中..." : "検索"}
            </Button>
            
            <ReportActions
              onDownloadPdf={() => alert("PDF出力機能は実装予定です")}
              onDownloadExcel={() => alert("Excel出力機能は実装予定です")}
            />
          </div>
        </CardContent>
      </Card>

      {/* 仕訳帳表示 */}
      <Card>
        <CardContent className="p-6">
          <div className="print:shadow-none">
            {/* 印刷用ヘッダー */}
            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-bold mb-2">仕 訳 帳</h1>
              <p className="text-sm">
                期間: {dateFrom ? format(dateFrom, "yyyy年MM月dd日", { locale: ja }) : ""} ～ {dateTo ? format(dateTo, "yyyy年MM月dd日", { locale: ja }) : ""}
              </p>
            </div>

            {/* Shadcn/UI Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-20">日付</TableHead>
                  <TableHead className="text-center w-32">仕訳番号</TableHead>
                  <TableHead className="text-center w-32">伝票摘要</TableHead>
                  <TableHead className="text-center w-12">行</TableHead>
                  <TableHead className="text-center w-12">借貸</TableHead>
                  <TableHead className="text-center w-16">科目</TableHead>
                  <TableHead className="text-center w-32">勘定科目名</TableHead>
                  <TableHead className="text-center w-16">補助</TableHead>
                  <TableHead className="text-center w-32">取引先</TableHead>
                  <TableHead className="text-center w-24">金額</TableHead>
                  <TableHead className="text-center">明細摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalData.map((journal) =>
                  journal.details.map((detail, index) => (
                    <TableRow key={`${journal.journalNumber}-${detail.lineNumber}`}>
                      {/* 日付・仕訳番号・伝票摘要は最初の行のみ表示 */}
                      {index === 0 && (
                        <>
                          <TableCell 
                            className="text-center align-top border-r"
                            rowSpan={journal.details.length}
                          >
                            {format(journal.journalDate, "MM/dd", { locale: ja })}
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
                      
                      <TableCell className="text-center border-r">{detail.lineNumber}</TableCell>
                      <TableCell className="text-center border-r">
                        {detail.debitCredit === "借方" ? "借" : "貸"}
                      </TableCell>
                      <TableCell className="text-center border-r">{detail.accountCode}</TableCell>
                      <TableCell className="border-r">{detail.accountName}</TableCell>
                      <TableCell className="text-center border-r">
                        {detail.subAccountCode || ""}
                      </TableCell>
                      <TableCell className="border-r">{detail.partnerName || ""}</TableCell>
                      <TableCell className="text-right border-r">
                        ¥{formatAmount(detail.amount)}
                      </TableCell>
                      <TableCell>
                        {detail.lineDescription || ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* 印刷用フッター */}
            <div className="hidden print:block mt-6 text-center text-sm">
              <p>印刷日時: {format(new Date(), "yyyy年MM月dd日 HH:mm", { locale: ja })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}