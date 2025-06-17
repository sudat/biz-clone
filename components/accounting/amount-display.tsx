"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AmountDisplayProps {
  amount: number | string;
  className?: string;
  showCurrency?: boolean;
  currency?: string;
  positive?: boolean;
  negative?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right" | "center";
}

// 定義済みのクラス名（CSVバンドル時の最適化回避）
const positiveClass = "text-green-600 font-medium";
const negativeClass = "text-red-600 font-medium";

export function AmountDisplay({
  amount,
  className,
  showCurrency = true,
  currency = "¥",
  positive,
  negative,
  size = "md",
  align = "right",
}: AmountDisplayProps) {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) || 0 : amount;

  // 金額の符号を判定（カラー表示は廃止）
  const isZero = numericAmount === 0;

  // 金額をフォーマット（3桁区切り、負数はマイナス記号付き）
  const formatAmount = (value: number) => {
    const abs = Math.abs(value).toLocaleString("ja-JP");
    return value < 0 ? `-${abs}` : abs;
  };

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const alignClasses = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  };

  return (
    <span
      className={cn(
        "font-mono font-medium",
        sizeClasses[size],
        alignClasses[align],
        isZero && "text-muted-foreground",
        className
      )}
    >
      {showCurrency && currency}
      {formatAmount(numericAmount)}
    </span>
  );
}

// 借方金額表示用（青色）
export function DebitAmount({
  amount,
  ...props
}: Omit<AmountDisplayProps, "positive" | "negative">) {
  return <AmountDisplay amount={amount} positive={amount !== 0} {...props} />;
}

// 貸方金額表示用（赤色）
export function CreditAmount({
  amount,
  ...props
}: Omit<AmountDisplayProps, "positive" | "negative">) {
  return <AmountDisplay amount={amount} negative={amount !== 0} {...props} />;
}

// 残高表示用（プラス/マイナスで色分け）
export function BalanceAmount({
  amount,
  ...props
}: Omit<AmountDisplayProps, "positive" | "negative">) {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) || 0 : amount;

  return (
    <AmountDisplay
      amount={amount}
      positive={numericAmount > 0}
      negative={numericAmount < 0}
      {...props}
    />
  );
}

// 合計金額表示用（大きめフォント）
export function TotalAmount({
  amount,
  label = "合計",
  className,
  ...props
}: AmountDisplayProps & {
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-center border-t pt-2",
        className
      )}
    >
      <span className="font-semibold">{label}</span>
      <AmountDisplay
        amount={amount}
        size="lg"
        className="font-bold"
        {...props}
      />
    </div>
  );
}

// 仕訳明細の金額入力用
interface JournalAmountInputProps {
  debitAmount: number;
  creditAmount: number;
  onDebitChange: (amount: number) => void;
  onCreditChange: (amount: number) => void;
  disabled?: boolean;
  error?: string;
}

export function JournalAmountInput({
  debitAmount,
  creditAmount,
  onDebitChange,
  onCreditChange,
  disabled = false,
  error,
}: JournalAmountInputProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-blue-600">借方金額</label>
        <input
          type="number"
          value={debitAmount || ""}
          onChange={(e) => onDebitChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className="w-full mt-1 p-2 border rounded-md text-right font-mono"
          placeholder="0"
          min="0"
          step="1"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-red-600">貸方金額</label>
        <input
          type="number"
          value={creditAmount || ""}
          onChange={(e) => onCreditChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className="w-full mt-1 p-2 border rounded-md text-right font-mono"
          placeholder="0"
          min="0"
          step="1"
        />
      </div>

      {error && (
        <div className="col-span-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

// 金額バランスチェック用のコンポーネント
interface AmountBalanceProps {
  debitTotal: number;
  creditTotal: number;
  className?: string;
}

export function AmountBalance({
  debitTotal,
  creditTotal,
  className,
}: AmountBalanceProps) {
  const isBalanced = debitTotal === creditTotal;
  const difference = Math.abs(debitTotal - creditTotal);

  return (
    <div className={cn("p-4 rounded-lg border", className)}>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">借方合計</p>
          <DebitAmount amount={debitTotal} size="lg" />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">貸方合計</p>
          <CreditAmount amount={creditTotal} size="lg" />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">差額</p>
          <AmountDisplay
            amount={difference}
            size="lg"
            className={cn(
              "font-bold",
              isBalanced ? "text-green-600" : "text-red-600"
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          "mt-3 p-2 rounded text-center text-sm font-medium",
          isBalanced
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        )}
      >
        {isBalanced ? "貸借バランスOK" : "貸借バランスが合いません"}
      </div>
    </div>
  );
}
