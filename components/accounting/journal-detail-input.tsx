/**
 * 仕訳明細入力コンポーネント
 * ============================================================================
 * 借方・貸方の明細入力フォーム
 * ============================================================================
 */

"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MasterCodeInput } from "./master-code-input";

export interface JournalDetailData {
  debitCredit: "debit" | "credit";
  accountCode: string;
  accountName?: string;
  subAccountCode?: string;
  subAccountName?: string;
  partnerCode?: string;
  partnerName?: string;
  analysisCode?: string;
  analysisCodeName?: string;
  amount: number;
  description?: string;
}

interface JournalDetailInputProps {
  type: "debit" | "credit";
  onAdd: (detail: JournalDetailData) => void;
  disabled?: boolean;
  className?: string;
}

const TYPE_CONFIG = {
  debit: {
    title: "借方",
    color: "slate",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    buttonColor: "bg-slate-600 hover:bg-slate-700",
  },
  credit: {
    title: "貸方",
    color: "slate",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    buttonColor: "bg-slate-600 hover:bg-slate-700",
  },
} as const;

export function JournalDetailInput({
  type,
  onAdd,
  disabled = false,
  className,
}: JournalDetailInputProps) {
  const [formData, setFormData] = useState<Partial<JournalDetailData>>({
    debitCredit: type,
    accountCode: "",
    subAccountCode: "",
    partnerCode: "",
    analysisCode: "",
    amount: undefined,
    description: "",
  });

  const config = TYPE_CONFIG[type];

  // フォームリセット
  const resetForm = () => {
    setFormData({
      debitCredit: type,
      accountCode: "",
      subAccountCode: "",
      partnerCode: "",
      analysisCode: "",
      amount: undefined,
      description: "",
    });
  };

  // 追加処理
  const handleAdd = () => {
    if (
      !formData.accountCode ||
      formData.amount == null ||
      formData.amount <= 0
    ) {
      return;
    }

    const detail: JournalDetailData = {
      debitCredit: type,
      accountCode: formData.accountCode,
      accountName: formData.accountName,
      subAccountCode: formData.subAccountCode,
      subAccountName: formData.subAccountName,
      partnerCode: formData.partnerCode,
      partnerName: formData.partnerName,
      analysisCode: formData.analysisCode,
      analysisCodeName: formData.analysisCodeName,
      amount: formData.amount,
      description: formData.description,
    };

    onAdd(detail);
    resetForm();
  };

  // 入力可能判定
  const canAdd =
    formData.accountCode && formData.amount != null && formData.amount > 0;

  // Enterキー処理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canAdd) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Card
      className={cn(
        "border-2 transition-all duration-200",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-700">
          {config.title}明細を追加
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 勘定科目 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            勘定科目 *
          </Label>
          <div className="flex-1">
            <MasterCodeInput
              type="account"
              value={formData.accountCode || ""}
              onChange={(code, name) =>
                setFormData((prev) => ({
                  ...prev,
                  accountCode: code,
                  accountName: name,
                }))
              }
              disabled={disabled}
              placeholder="勘定科目を選択..."
            />
          </div>
        </div>

        {/* 補助科目 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            補助科目
          </Label>
          <div className="flex-1">
            <MasterCodeInput
              type="subAccount"
              value={formData.subAccountCode || ""}
              onChange={(code, name) =>
                setFormData((prev) => ({
                  ...prev,
                  subAccountCode: code,
                  subAccountName: name,
                }))
              }
              parentCode={formData.accountCode}
              disabled={disabled || !formData.accountCode}
              placeholder={
                formData.accountCode
                  ? "補助科目を選択..."
                  : "先に勘定科目を選択"
              }
            />
          </div>
        </div>

        {/* 取引先 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            取引先
          </Label>
          <div className="flex-1">
            <MasterCodeInput
              type="partner"
              value={formData.partnerCode || ""}
              onChange={(code, name) =>
                setFormData((prev) => ({
                  ...prev,
                  partnerCode: code,
                  partnerName: name,
                }))
              }
              disabled={disabled}
              placeholder="取引先を選択..."
            />
          </div>
        </div>

        {/* 分析コード */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            分析コード
          </Label>
          <div className="flex-1">
            <MasterCodeInput
              type="analysisCode"
              value={formData.analysisCode || ""}
              onChange={(code, name) =>
                setFormData((prev) => ({
                  ...prev,
                  analysisCode: code,
                  analysisCodeName: name,
                }))
              }
              disabled={disabled}
              placeholder="分析コードを選択..."
            />
          </div>
        </div>

        {/* 金額 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            金額 *
          </Label>
          <div className="w-40">
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.amount == null ? "" : formData.amount}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  amount: value === "" ? undefined : parseFloat(value) || 0,
                }));
              }}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              placeholder="金額を入力..."
              className="text-right font-mono h-9"
            />
          </div>
        </div>

        {/* 摘要 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            摘要
          </Label>
          <div className="flex-1">
            <Input
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              onKeyPress={handleKeyPress}
              disabled={disabled}
              placeholder="摘要を入力（任意）..."
              className="h-9"
            />
          </div>
        </div>

        {/* 追加ボタン */}
        <Button
          onClick={handleAdd}
          disabled={!canAdd || disabled}
          className={cn(
            "w-full text-white font-medium transition-all duration-200",
            config.buttonColor
          )}
        >
          <Plus className="h-4 w-4 mr-2" />
          {config.title}明細を追加
        </Button>

        {/* バリデーションメッセージ */}
        {!canAdd &&
          (formData.accountCode ||
            (formData.amount != null && formData.amount !== 0)) && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              勘定科目と金額（1円以上）の入力が必要です
            </div>
          )}
      </CardContent>
    </Card>
  );
}
