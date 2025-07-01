/**
 * 勘定照合明細画面
 * ============================================================================
 * 勘定照合レポートから選択された組み合わせの詳細仕訳を表示
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  getReconciliationDetailData,
  ReconciliationDetailData,
} from "@/app/actions/reconciliation-report";
import type { ReconciliationMapping } from "@prisma/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

// 結合された明細データ型
interface CombinedDetailData {
  journalNumber: string;
  journalDate: Date;
  description: string | null;
  
  // 計上部門・勘定科目側
  primaryJournalNumber: string;
  primaryLineNumber: number;
  primaryDepartmentCode: string | null;
  primaryDepartmentName: string | null;
  primaryAccountCode: string;
  primaryAccountName: string;
  primaryAmount: number; // 借方はプラス、貸方はマイナス
  
  // 相手計上部門・相手勘定科目側
  counterJournalNumber: string;
  counterLineNumber: number;
  counterDepartmentCode: string | null;
  counterDepartmentName: string | null;
  counterAccountCode: string;
  counterAccountName: string;
  counterAmount: number; // 借方はプラス、貸方はマイナス
  
  // 差額
  difference: number;
}

export default function ReconciliationDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [mapping, setMapping] = useState<ReconciliationMapping | null>(null);
  const [primaryData, setPrimaryData] = useState<ReconciliationDetailData[]>([]);
  const [counterData, setCounterData] = useState<ReconciliationDetailData[]>([]);
  const [combinedData, setCombinedData] = useState<CombinedDetailData[]>([]);

  // URLパラメータの取得
  const mappingId = searchParams.get("mappingId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const departmentCode = searchParams.get("departmentCode") || "";
  const accountCode = searchParams.get("accountCode") || "";
  const counterDepartmentCode = searchParams.get("counterDepartmentCode") || "";
  const counterAccountCode = searchParams.get("counterAccountCode") || "";

  useEffect(() => {
    const loadDetailData = async () => {
      if (!mappingId || !dateFrom || !dateTo) {
        toast.error("必要なパラメータが不足しています");
        router.push("/reports/reconciliation");
        return;
      }

      setIsLoading(true);
      try {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        // 計上部門・勘定科目の明細データを取得
        const primaryResult = await getReconciliationDetailData(
          mappingId,
          fromDate,
          toDate,
          "primary"
        );

        // 相手計上部門・相手勘定科目の明細データを取得
        const counterResult = await getReconciliationDetailData(
          mappingId,
          fromDate,
          toDate,
          "counter"
        );

        if (primaryResult.success && counterResult.success) {
          setMapping(primaryResult.mapping || null);
          setPrimaryData(primaryResult.data || []);
          setCounterData(counterResult.data || []);
          
          // データ結合処理
          combineDetailData(primaryResult.data || [], counterResult.data || []);
        } else {
          toast.error("明細データの取得に失敗しました");
          router.push("/reports/reconciliation");
        }
      } catch (error) {
        console.error("明細データ取得エラー:", error);
        toast.error("データの取得中にエラーが発生しました");
        router.push("/reports/reconciliation");
      } finally {
        setIsLoading(false);
      }
    };

    loadDetailData();
  }, [mappingId, dateFrom, dateTo, router]);

  // 明細データを結合する関数
  const combineDetailData = (
    primary: ReconciliationDetailData[],
    counter: ReconciliationDetailData[]
  ) => {
    // 全ての仕訳番号を取得
    const allJournalNumbers = [
      ...new Set([
        ...primary.map(d => d.journalNumber),
        ...counter.map(d => d.journalNumber)
      ])
    ].sort();

    const combined: CombinedDetailData[] = [];

    allJournalNumbers.forEach(journalNumber => {
      const primaryDetails = primary.filter(d => d.journalNumber === journalNumber);
      const counterDetails = counter.filter(d => d.journalNumber === journalNumber);

      // 主たる仕訳データ（計上部門・勘定科目または相手計上部門・相手勘定科目のいずれか）
      const mainDetails = primaryDetails.length > 0 ? primaryDetails : counterDetails;
      
      mainDetails.forEach(mainDetail => {
        // 対応する相手側明細を検索
        const correspondingDetail = primaryDetails.length > 0 
          ? counterDetails.find(d => d.journalNumber === journalNumber)
          : primaryDetails.find(d => d.journalNumber === journalNumber);

        // 金額を借方=プラス、貸方=マイナスで計算
        const calculateAmount = (detail: ReconciliationDetailData) => {
          return detail.debitCredit === "D" ? detail.totalAmount : -detail.totalAmount;
        };

        const primaryDetail = primaryDetails.length > 0 ? mainDetail : correspondingDetail;
        const counterDetail = primaryDetails.length > 0 ? correspondingDetail : mainDetail;

        if (primaryDetail && counterDetail) {
          const primaryAmount = calculateAmount(primaryDetail);
          const counterAmount = calculateAmount(counterDetail);
          
          combined.push({
            journalNumber: journalNumber,
            journalDate: mainDetail.journalDate,
            description: mainDetail.description,
            
            primaryJournalNumber: primaryDetail.journalNumber,
            primaryLineNumber: primaryDetail.lineNumber,
            primaryDepartmentCode: primaryDetail.departmentCode,
            primaryDepartmentName: primaryDetail.departmentName,
            primaryAccountCode: primaryDetail.accountCode,
            primaryAccountName: primaryDetail.accountName,
            primaryAmount: primaryAmount,
            
            counterJournalNumber: counterDetail.journalNumber,
            counterLineNumber: counterDetail.lineNumber,
            counterDepartmentCode: counterDetail.departmentCode,
            counterDepartmentName: counterDetail.departmentName,
            counterAccountCode: counterDetail.accountCode,
            counterAccountName: counterDetail.accountName,
            counterAmount: counterAmount,
            
            difference: Math.abs(Math.abs(primaryAmount) - Math.abs(counterAmount)),
          });
        } else if (primaryDetails.length > 0) {
          // 計上部門・勘定科目のみの場合
          const primaryAmount = calculateAmount(mainDetail);
          combined.push({
            journalNumber: journalNumber,
            journalDate: mainDetail.journalDate,
            description: mainDetail.description,
            
            primaryJournalNumber: mainDetail.journalNumber,
            primaryLineNumber: mainDetail.lineNumber,
            primaryDepartmentCode: mainDetail.departmentCode,
            primaryDepartmentName: mainDetail.departmentName,
            primaryAccountCode: mainDetail.accountCode,
            primaryAccountName: mainDetail.accountName,
            primaryAmount: primaryAmount,
            
            counterJournalNumber: "",
            counterLineNumber: 0,
            counterDepartmentCode: null,
            counterDepartmentName: null,
            counterAccountCode: "",
            counterAccountName: "",
            counterAmount: 0,
            
            difference: Math.abs(primaryAmount),
          });
        } else {
          // 相手計上部門・相手勘定科目のみの場合
          const counterAmount = calculateAmount(mainDetail);
          combined.push({
            journalNumber: journalNumber,
            journalDate: mainDetail.journalDate,
            description: mainDetail.description,
            
            primaryJournalNumber: "",
            primaryLineNumber: 0,
            primaryDepartmentCode: null,
            primaryDepartmentName: null,
            primaryAccountCode: "",
            primaryAccountName: "",
            primaryAmount: 0,
            
            counterJournalNumber: mainDetail.journalNumber,
            counterLineNumber: mainDetail.lineNumber,
            counterDepartmentCode: mainDetail.departmentCode,
            counterDepartmentName: mainDetail.departmentName,
            counterAccountCode: mainDetail.accountCode,
            counterAccountName: mainDetail.accountName,
            counterAmount: counterAmount,
            
            difference: Math.abs(counterAmount),
          });
        }
      });
    });

    // 日付・仕訳番号でソート
    combined.sort((a, b) => {
      const dateCompare = a.journalDate.getTime() - b.journalDate.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.journalNumber.localeCompare(b.journalNumber);
    });

    setCombinedData(combined);
  };

  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "0";
    }
    return amount.toLocaleString("ja-JP");
  };

  const handleBackToReport = () => {
    router.push("/reports/reconciliation");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <span className="text-primary animate-pulse">データを読み込み中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:full-width">
      {/* ヘッダー情報 */}
      <Card className="print:hide-search">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToReport}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                戻る
              </Button>
              <CardTitle>勘定照合明細</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mapping && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground">計上部門・勘定科目</div>
                <div className="pl-4">
                  <div>部門: {departmentCode}</div>
                  <div>科目: {accountCode}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground">相手計上部門・相手勘定科目</div>
                <div className="pl-4">
                  <div>部門: {counterDepartmentCode}</div>
                  <div>科目: {counterAccountCode}</div>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <div className="font-medium text-muted-foreground">対象期間</div>
                <div className="pl-4">
                  {dateFrom && dateTo && (
                    <span>
                      {format(new Date(dateFrom), "yyyy/MM/dd", { locale: ja })} ～{" "}
                      {format(new Date(dateTo), "yyyy/MM/dd", { locale: ja })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 明細表示 */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-6 print:p-0">
          <div className="print:break-avoid">
            {/* 印刷用ヘッダー */}
            <div className="hidden print:block mb-4 text-center print:break-avoid">
              <h1 className="text-xl font-bold mb-1 print:text-lg">
                勘定照合明細
              </h1>
              <p className="text-xs print:text-xs">
                期間:{" "}
                {dateFrom && dateTo && (
                  <>
                    {format(new Date(dateFrom), "yyyy年MM月dd日", { locale: ja })} ～{" "}
                    {format(new Date(dateTo), "yyyy年MM月dd日", { locale: ja })}
                  </>
                )}
              </p>
              <p className="text-xs print:text-xs mt-1">
                明細件数: {combinedData.length}件
              </p>
            </div>

            {/* データ件数表示 */}
            <div className="mb-4 text-sm text-muted-foreground print:hidden flex justify-between items-center">
              <span>明細件数: {combinedData.length}件</span>
            </div>

            {/* 明細テーブル */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-32 print:w-auto">
                      伝票摘要
                    </TableHead>
                    <TableHead className="text-center w-32 print:w-auto">
                      仕訳番号
                    </TableHead>
                    <TableHead className="text-center w-20 print:w-auto">
                      計上部門
                    </TableHead>
                    <TableHead className="text-center w-24 print:w-auto">
                      勘定科目
                    </TableHead>
                    <TableHead className="text-center w-24 print:w-auto">
                      金額
                    </TableHead>
                    <TableHead className="text-center w-32 print:w-auto">
                      仕訳番号
                    </TableHead>
                    <TableHead className="text-center w-20 print:w-auto">
                      相手計上部門
                    </TableHead>
                    <TableHead className="text-center w-24 print:w-auto">
                      相手勘定科目
                    </TableHead>
                    <TableHead className="text-center w-24 print:w-auto">
                      金額
                    </TableHead>
                    <TableHead className="text-center w-24 print:w-auto">
                      差額
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-8 text-muted-foreground"
                      >
                        該当する明細データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    combinedData.map((detail, index) => (
                      <TableRow key={`${detail.journalNumber}-${index}`}>
                        <TableCell className="border-r">
                          {detail.description || ""}
                        </TableCell>
                        <TableCell className="text-center border-r text-xs">
                          {detail.primaryJournalNumber}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          {detail.primaryDepartmentCode || ""}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          {detail.primaryAccountCode}
                        </TableCell>
                        <TableCell className="text-right border-r">
                          {detail.primaryAmount !== 0 ? `¥${formatAmount(detail.primaryAmount)}` : ""}
                        </TableCell>
                        <TableCell className="text-center border-r text-xs">
                          {detail.counterJournalNumber}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          {detail.counterDepartmentCode || ""}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          {detail.counterAccountCode}
                        </TableCell>
                        <TableCell className="text-right border-r">
                          {detail.counterAmount !== 0 ? `¥${formatAmount(detail.counterAmount)}` : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          ¥{formatAmount(detail.difference)}
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