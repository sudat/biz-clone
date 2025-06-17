/**
 * 仕訳明細入力コンポーネント
 * ============================================================================
 * 借方・貸方の明細入力フォーム
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MasterCodeInput } from "./master-code-input";

import type { JournalDetailData } from "@/types/journal";
import { getTaxRates, type TaxRateForClient } from "@/app/actions/tax-rates";
import { getAccounts } from "@/app/actions/accounts";

interface JournalDetailInputProps {
  type: "debit" | "credit";
  onAdd: (detail: JournalDetailData) => void;
  onUpdate?: (detail: JournalDetailData) => void;
  onCancelEdit?: () => void;
  editingDetail?: JournalDetailData | null;
  mode?: "input" | "edit";
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
  onUpdate,
  onCancelEdit,
  editingDetail,
  mode = "input",
  disabled = false,
  className,
}: JournalDetailInputProps) {
  const [formData, setFormData] = useState<Partial<JournalDetailData>>({
    debitCredit: type,
    accountCode: "",
    subAccountCode: "",
    partnerCode: "",
    analysisCode: "",
    baseAmount: undefined,
    taxAmount: 0,
    totalAmount: undefined,
    taxCode: "TAX0", // デフォルトは非課税
    description: "",
  });

  // 税区分マスタ関連の状態
  const [taxRateOptions, setTaxRateOptions] = useState<TaxRateForClient[]>([]);
  const [taxRatesLoading, setTaxRatesLoading] = useState(false);

  const config = TYPE_CONFIG[type];

  // 税区分マスタデータを取得
  useEffect(() => {
    const loadTaxRates = async () => {
      setTaxRatesLoading(true);
      try {
        const result = await getTaxRates();
        if (result.success && result.data) {
          setTaxRateOptions(result.data);
        }
      } catch (error) {
        console.error("税区分の取得に失敗:", error);
      } finally {
        setTaxRatesLoading(false);
      }
    };

    loadTaxRates();
  }, []);

  // 編集時にフォームデータを初期化
  useEffect(() => {
    if (mode === "edit" && editingDetail) {
      setFormData({
        debitCredit: editingDetail.debitCredit,
        accountCode: editingDetail.accountCode || "",
        accountName: editingDetail.accountName,
        subAccountCode: editingDetail.subAccountCode || "",
        subAccountName: editingDetail.subAccountName,
        partnerCode: editingDetail.partnerCode || "",
        partnerName: editingDetail.partnerName,
        analysisCode: editingDetail.analysisCode || "",
        analysisCodeName: editingDetail.analysisCodeName,
        baseAmount: editingDetail.baseAmount,
        taxAmount: editingDetail.taxAmount,
        totalAmount: editingDetail.totalAmount,
        taxCode: editingDetail.taxCode || "TAX0",
        description: editingDetail.description || "",
      });
    } else if (mode === "input") {
      resetForm();
    }
  }, [mode, editingDetail, type]);

  // フォームリセット
  const resetForm = () => {
    setFormData({
      debitCredit: type,
      accountCode: "",
      subAccountCode: "",
      partnerCode: "",
      analysisCode: "",
      baseAmount: undefined,
      taxAmount: 0,
      totalAmount: undefined,
      taxCode: "TAX0", // デフォルトは非課税
      description: "",
    });
  };

  // 消費税自動計算（税区分コードから税率を取得）
  const calculateTax = (baseAmount: number, taxCode: string) => {
    if (taxCode && taxCode !== "TAX0") {
      const taxRateOption = taxRateOptions.find(
        (rate) => rate.taxCode === taxCode
      );
      if (taxRateOption && taxRateOption.taxRate > 0) {
        return Math.floor(baseAmount * (taxRateOption.taxRate / 100));
      }
    }
    return 0;
  };

  // 本体額変更時の処理
  const handleBaseAmountChange = (baseAmount: number) => {
    const taxAmount = calculateTax(baseAmount, formData.taxCode || "TAX0");
    const totalAmount = baseAmount + taxAmount;

    setFormData((prev) => ({
      ...prev,
      baseAmount,
      taxAmount,
      totalAmount,
    }));
  };

  // 税区分変更時の処理
  const handleTaxCodeChange = (value: string) => {
    const baseAmount = formData.baseAmount || 0;
    const taxAmount = calculateTax(baseAmount, value);
    const totalAmount = baseAmount + taxAmount;

    setFormData((prev) => ({
      ...prev,
      taxCode: value,
      taxAmount,
      totalAmount,
    }));
  };

  // 追加・更新処理
  const handleSubmit = () => {
    if (
      !formData.accountCode ||
      formData.totalAmount == null ||
      formData.totalAmount <= 0
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
      baseAmount: formData.baseAmount || 0,
      taxAmount: formData.taxAmount || 0,
      totalAmount: formData.totalAmount || 0,
      taxCode: formData.taxCode,
      description: formData.description,
    };

    if (mode === "edit" && onUpdate) {
      onUpdate(detail);
    } else {
      onAdd(detail);
      resetForm();
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  // 入力可能判定
  const canSubmit =
    formData.accountCode &&
    formData.totalAmount != null &&
    formData.totalAmount > 0;

  // Enterキー処理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && mode === "edit") {
      e.preventDefault();
      handleCancel();
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-black">
            {mode === "edit"
              ? `${config.title}明細を編集`
              : `${config.title}明細を追加`}
          </CardTitle>
          {mode === "edit" && !disabled && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              編集中
            </div>
          )}
        </div>
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
              onChange={async (code, name) => {
                // 勘定科目選択時のデフォルト税区分自動設定
                let defaultTaxCode = "TAX0"; // デフォルトは非課税

                if (code) {
                  try {
                    // 勘定科目の情報を取得してデフォルト税区分をチェック
                    const accountResult = await getAccounts();
                    if (accountResult.success && accountResult.data) {
                      const account = accountResult.data.find(
                        (acc) => acc.accountCode === code
                      );
                      if (account?.defaultTaxCode) {
                        defaultTaxCode = account.defaultTaxCode;
                      }
                    }
                  } catch (error) {
                    console.error(
                      "勘定科目のデフォルト税区分取得エラー:",
                      error
                    );
                  }
                }

                // 税額を再計算
                const baseAmount = formData.baseAmount || 0;
                const taxAmount = calculateTax(baseAmount, defaultTaxCode);
                const totalAmount = baseAmount + taxAmount;

                setFormData((prev) => ({
                  ...prev,
                  accountCode: code,
                  accountName: name,
                  taxCode: defaultTaxCode,
                  taxAmount,
                  totalAmount,
                }));
              }}
              disabled={disabled}
              readOnly={disabled && mode === "edit"}
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
              readOnly={disabled && mode === "edit"}
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
              readOnly={disabled && mode === "edit"}
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
              readOnly={disabled && mode === "edit"}
              placeholder="分析コードを選択..."
            />
          </div>
        </div>

        {/* 税区分 */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            税区分
          </Label>
          <div className="w-64">
            <Select
              value={formData.taxCode || "TAX0"}
              onValueChange={handleTaxCodeChange}
              disabled={disabled || taxRatesLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="税区分を選択..." />
              </SelectTrigger>
              <SelectContent>
                {taxRateOptions.map((option) => (
                  <SelectItem key={option.taxCode} value={option.taxCode}>
                    {option.taxName} ({option.taxRate}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 金額（本体額 + 消費税額） */}
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium whitespace-nowrap">
            金額 *
          </Label>
          <div className="flex-1 flex gap-2">
            {/* 本体額 */}
            <div className="flex-1">
              <div className="text-xs text-black mb-1">本体額</div>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.baseAmount == null ? "" : formData.baseAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  const baseAmount = value === "" ? 0 : parseFloat(value) || 0;
                  handleBaseAmountChange(baseAmount);
                }}
                onKeyPress={handleKeyPress}
                disabled={disabled}
                readOnly={disabled && mode === "edit"}
                placeholder="本体額を入力..."
                className="text-right font-mono h-9 text-black disabled:opacity-80 read-only:opacity-80 read-only:cursor-default"
              />
            </div>

            {/* 消費税額（表示のみ） */}
            <div className="w-24">
              <div className="text-xs text-black mb-1">消費税</div>
              <div className="h-9 px-3 border border-input bg-slate-100 text-right font-mono text-sm text-black rounded-md flex items-center justify-end opacity-80">
                ¥{(formData.taxAmount || 0).toLocaleString()}
              </div>
            </div>

            {/* 合計額（表示のみ） */}
            <div className="w-32">
              <div className="text-xs text-black mb-1">合計</div>
              <div className="h-9 px-3 border-2 border-blue-200 bg-blue-50 text-right font-mono text-sm font-semibold text-black rounded-md flex items-center justify-end opacity-80">
                ¥{(formData.totalAmount || 0).toLocaleString()}
              </div>
            </div>
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
              readOnly={disabled && mode === "edit"}
              placeholder="摘要を入力（任意）..."
              className="h-9 text-black disabled:opacity-80 read-only:opacity-80 read-only:cursor-default"
            />
          </div>
        </div>

        {/* ボタンエリア */}
        <div className="flex gap-2">
          {mode === "edit" ? (
            <>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={disabled}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || disabled}
                className={cn(
                  "flex-1 text-white font-medium transition-all duration-200",
                  config.buttonColor
                )}
              >
                明細を更新
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || disabled}
              className={cn(
                "w-full text-white font-medium transition-all duration-200",
                config.buttonColor
              )}
            >
              <Plus className="h-4 w-4" />
              {config.title}明細を追加
            </Button>
          )}
        </div>

        {/* バリデーションメッセージ */}
        {!canSubmit &&
          (formData.accountCode ||
            (formData.totalAmount != null && formData.totalAmount !== 0)) && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              勘定科目と金額（1円以上）の入力が必要です
            </div>
          )}

        {/* 編集モード時のヒント（照会画面では非表示） */}
        {mode === "edit" && !disabled && (
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
            Enterで更新、Escapeでキャンセルできます
          </div>
        )}
      </CardContent>
    </Card>
  );
}
