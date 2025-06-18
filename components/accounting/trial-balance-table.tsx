/**
 * 試算表テーブルコンポーネント
 * ============================================================================
 * 勘定科目階層対応の試算表表示・科目タイプ別小計・総合計機能
 * ============================================================================
 */

"use client";

import React, { useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { TrialBalanceData } from "@/app/actions/trial-balance";

interface TrialBalanceTableProps {
  data: TrialBalanceData[];
  showSubtotals?: boolean;
  showGrandTotal?: boolean;
  className?: string;
}

// 科目タイプ別の集計データ
interface AccountTypeSubtotal {
  accountType: string;
  openingBalance: number;
  debitAmount: number;
  creditAmount: number;
  closingBalance: number;
  count: number;
}

export function TrialBalanceTable({
  data,
  showSubtotals = true,
  showGrandTotal = true,
  className,
}: TrialBalanceTableProps) {
  // 科目タイプ別小計を計算（メモ化）
  const subtotals = useMemo((): AccountTypeSubtotal[] => {
    if (!showSubtotals) return [];

    const subtotalsMap = new Map<string, AccountTypeSubtotal>();

    data.forEach((item) => {
      // レベル0（親科目）のみを集計対象とする
      if (item.level === 0) {
        const existing = subtotalsMap.get(item.accountType) || {
          accountType: item.accountType,
          openingBalance: 0,
          debitAmount: 0,
          creditAmount: 0,
          closingBalance: 0,
          count: 0,
        };

        existing.openingBalance += item.openingBalance;
        existing.debitAmount += item.debitAmount;
        existing.creditAmount += item.creditAmount;
        existing.closingBalance += item.closingBalance;
        existing.count += 1;

        subtotalsMap.set(item.accountType, existing);
      }
    });

    return Array.from(subtotalsMap.values()).sort((a, b) =>
      a.accountType.localeCompare(b.accountType)
    );
  }, [data, showSubtotals]);

  // 総合計を計算（メモ化）
  const grandTotal = useMemo(() => {
    if (!showGrandTotal) return null;

    const parentAccounts = data.filter((item) => item.level === 0);

    return parentAccounts.reduce(
      (total, item) => ({
        openingBalance: total.openingBalance + item.openingBalance,
        debitAmount: total.debitAmount + item.debitAmount,
        creditAmount: total.creditAmount + item.creditAmount,
        closingBalance: total.closingBalance + item.closingBalance,
      }),
      {
        openingBalance: 0,
        debitAmount: 0,
        creditAmount: 0,
        closingBalance: 0,
      }
    );
  }, [data, showGrandTotal]);

  // データを科目タイプ別にグループ化（メモ化）
  const { groupedData, accountTypes } = useMemo(() => {
    const grouped = data.reduce((groups, item) => {
      const type = item.accountType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
      return groups;
    }, {} as Record<string, TrialBalanceData[]>);

    const types = Object.keys(grouped).sort();

    return { groupedData: grouped, accountTypes: types };
  }, [data]);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-20 print:w-auto">
              科目コード
            </TableHead>
            <TableHead className="text-center w-48 print:w-auto">
              勘定科目名
            </TableHead>
            <TableHead className="text-center w-20 print:w-auto">
              補助コード
            </TableHead>
            <TableHead className="text-center w-32 print:w-auto">
              補助科目名
            </TableHead>
            <TableHead className="text-center w-24 print:w-auto">
              期首残高
            </TableHead>
            <TableHead className="text-center w-24 print:w-auto">
              借方計上額
            </TableHead>
            <TableHead className="text-center w-24 print:w-auto">
              貸方計上額
            </TableHead>
            <TableHead className="text-center w-24 print:w-auto">
              期末残高
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center py-8 text-muted-foreground"
              >
                検索条件に該当するデータがありません
              </TableCell>
            </TableRow>
          ) : (
            <>
              {/* データ行 */}
              {showSubtotals
                ? // 科目タイプ別にグループ表示
                  accountTypes.map((accountType) => (
                    <React.Fragment key={accountType}>
                      {/* 科目タイプヘッダー */}
                      <TableRow className="bg-slate-50">
                        <TableCell
                          colSpan={8}
                          className="font-semibold text-slate-700 py-2"
                        >
                          【{accountType}】
                        </TableCell>
                      </TableRow>

                      {/* 該当科目の明細 */}
                      {groupedData[accountType].map((item, index) => (
                        <TableRow
                          key={`${item.accountCode}-${
                            item.subAccountCode || "main"
                          }-${index}`}
                        >
                          <TableCell className="text-center border-r">
                            {item.level === 0 ? item.accountCode : ""}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "border-r",
                              item.level === 1 ? "pl-6" : ""
                            )}
                          >
                            {item.accountName}
                          </TableCell>
                          <TableCell className="text-center border-r">
                            {item.subAccountCode || ""}
                          </TableCell>
                          <TableCell className="border-r">
                            {item.subAccountName || ""}
                          </TableCell>
                          <TableCell className="text-right border-r">
                            <BalanceAmount
                              amount={item.openingBalance}
                              showCurrency={true}
                            />
                          </TableCell>
                          <TableCell className="text-right border-r">
                            <AmountDisplay
                              amount={item.debitAmount}
                              showCurrency={true}
                            />
                          </TableCell>
                          <TableCell className="text-right border-r">
                            <AmountDisplay
                              amount={item.creditAmount}
                              showCurrency={true}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <BalanceAmount
                              amount={item.closingBalance}
                              showCurrency={true}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* 科目タイプ別小計 */}
                      {(() => {
                        const subtotal = subtotals.find(
                          (s) => s.accountType === accountType
                        );
                        return subtotal ? (
                          <TableRow className="bg-slate-50 border-t border-slate-300">
                            <TableCell className="border-r"></TableCell>
                            <TableCell className="font-semibold text-slate-700 border-r">
                              {accountType} 小計 ({subtotal.count}件)
                            </TableCell>
                            <TableCell className="border-r"></TableCell>
                            <TableCell className="border-r"></TableCell>
                            <TableCell className="text-right border-r">
                              <BalanceAmount
                                amount={subtotal.openingBalance}
                                showCurrency={true}
                                className="font-semibold text-slate-700"
                              />
                            </TableCell>
                            <TableCell className="text-right border-r">
                              <AmountDisplay
                                amount={subtotal.debitAmount}
                                showCurrency={true}
                                className="font-semibold text-slate-700"
                              />
                            </TableCell>
                            <TableCell className="text-right border-r">
                              <AmountDisplay
                                amount={subtotal.creditAmount}
                                showCurrency={true}
                                className="font-semibold text-slate-700"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <BalanceAmount
                                amount={subtotal.closingBalance}
                                showCurrency={true}
                                className="font-semibold text-slate-700"
                              />
                            </TableCell>
                          </TableRow>
                        ) : null;
                      })()}
                    </React.Fragment>
                  ))
                : // 通常表示（グループ化なし）
                  data.map((item, index) => (
                    <TableRow
                      key={`${item.accountCode}-${
                        item.subAccountCode || "main"
                      }-${index}`}
                    >
                      <TableCell className="text-center border-r">
                        {item.level === 0 ? item.accountCode : ""}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "border-r",
                          item.level === 1 ? "pl-6" : ""
                        )}
                      >
                        {item.accountName}
                      </TableCell>
                      <TableCell className="text-center border-r">
                        {item.subAccountCode || ""}
                      </TableCell>
                      <TableCell className="border-r">
                        {item.subAccountName || ""}
                      </TableCell>
                      <TableCell className="text-right border-r">
                        <BalanceAmount
                          amount={item.openingBalance}
                          showCurrency={true}
                        />
                      </TableCell>
                      <TableCell className="text-right border-r">
                        <AmountDisplay
                          amount={item.debitAmount}
                          showCurrency={true}
                        />
                      </TableCell>
                      <TableCell className="text-right border-r">
                        <AmountDisplay
                          amount={item.creditAmount}
                          showCurrency={true}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <BalanceAmount
                          amount={item.closingBalance}
                          showCurrency={true}
                        />
                      </TableCell>
                    </TableRow>
                  ))}

              {/* 総合計行 */}
              {grandTotal && (
                <TableRow className="bg-slate-100 border-t-2 border-slate-400">
                  <TableCell className="border-r"></TableCell>
                  <TableCell className="font-bold text-slate-900 border-r">
                    総合計
                  </TableCell>
                  <TableCell className="border-r"></TableCell>
                  <TableCell className="border-r"></TableCell>
                  <TableCell className="text-right border-r">
                    <BalanceAmount
                      amount={grandTotal.openingBalance}
                      showCurrency={true}
                      className="font-bold text-slate-900"
                    />
                  </TableCell>
                  <TableCell className="text-right border-r">
                    <AmountDisplay
                      amount={grandTotal.debitAmount}
                      showCurrency={true}
                      className="font-bold text-slate-900"
                    />
                  </TableCell>
                  <TableCell className="text-right border-r">
                    <AmountDisplay
                      amount={grandTotal.creditAmount}
                      showCurrency={true}
                      className="font-bold text-slate-900"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <BalanceAmount
                      amount={grandTotal.closingBalance}
                      showCurrency={true}
                      className="font-bold text-slate-900"
                    />
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
