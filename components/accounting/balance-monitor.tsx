/**
 * バランス監視バーコンポーネント
 * ============================================================================
 * 借方・貸方の差額監視とバランス状態の視覚表示（シンプル版）
 * ============================================================================
 */

"use client";

import React from "react";
import { Scale, CheckCircle, AlertTriangle, Save, RefreshCw, Edit, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BalanceMonitorProps {
  debitTotal: number;
  creditTotal: number;
  className?: string;
  // 保存・リセット機能（作成モード）
  onSubmit?: () => void;
  onReset?: () => void;
  canSave?: boolean;
  isSubmitting?: boolean;
  // 更新・削除機能（照会モード）
  onUpdate?: () => void;
  onDelete?: () => void;
  mode?: 'create' | 'inquiry';
  hasDetails?: boolean;
  detailsCount?: number;
  disabled?: boolean;
}

// 通貨フォーマット
const formatCurrency = (amount: number): string => {
  if (amount === 0) return "―";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(amount);
};

export function BalanceMonitor({
  debitTotal,
  creditTotal,
  className,
  onSubmit,
  onReset,
  canSave = false,
  isSubmitting = false,
  onUpdate,
  onDelete,
  mode = 'create',
  hasDetails = false,
  detailsCount = 0,
  disabled = false
}: BalanceMonitorProps) {
  const difference = debitTotal - creditTotal;
  const isBalanced = Math.abs(difference) < 0.01;
  const hasEntries = debitTotal > 0 || creditTotal > 0;

  // バランス状態の判定
  const getBalanceStatus = () => {
    if (!hasEntries) {
      return {
        status: 'empty',
        color: 'text-slate-500',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        icon: Scale,
        message: '明細を追加してください'
      };
    }
    
    if (isBalanced) {
      return {
        status: 'balanced',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircle,
        message: 'バランス済み'
      };
    }
    
    return {
      status: 'unbalanced',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: AlertTriangle,
      message: `差額 ¥${Math.abs(difference).toLocaleString()}`
    };
  };

  const balanceStatus = getBalanceStatus();
  const StatusIcon = balanceStatus.icon;

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all duration-200",
      balanceStatus.borderColor,
      balanceStatus.bgColor,
      className
    )}>
      {/* 1行レイアウト: 左側（差額）、中央（合計）、右側（ボタン） */}
      <div className="flex items-center justify-between">
        {/* 左側: 差額表示 */}
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4", balanceStatus.color)} />
          <span className={cn("text-sm font-medium", balanceStatus.color)}>
            {balanceStatus.message}
          </span>
          {hasDetails && detailsCount > 0 && (
            <span className="text-xs text-slate-500">
              ({detailsCount}件)
            </span>
          )}
        </div>

        {/* 中央: 借方・貸方合計 */}
        <div className="flex items-center gap-4">
          {hasEntries && (
            <span className="text-sm text-slate-600 font-mono">
              借方 {formatCurrency(debitTotal)}、貸方 {formatCurrency(creditTotal)}
            </span>
          )}
        </div>

        {/* 右側: アクションボタン */}
        {mode === 'create' && onSubmit && onReset ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={disabled || isSubmitting || (!hasDetails)}
              className="min-w-[80px]"
            >
              <RefreshCw className="h-3 w-3" />
              リセット
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={!canSave || disabled}
              className={cn(
                "min-w-[100px] transition-all duration-200",
                canSave ? "bg-green-600 hover:bg-green-700" : "bg-slate-400"
              )}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  仕訳を保存
                </>
              )}
            </Button>
          </div>
        ) : mode === 'inquiry' && (onUpdate || onDelete) ? (
          <div className="flex gap-2">
            {onUpdate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUpdate}
                disabled={disabled}
                className="min-w-[80px]"
              >
                <Edit className="h-3 w-3" />
                更新
              </Button>
            )}

            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={disabled}
                className="min-w-[80px]"
              >
                <Trash2 className="h-3 w-3" />
                削除
              </Button>
            )}
          </div>
        ) : (
          <div /> // 空のdivでレイアウトを保持
        )}
      </div>
    </div>
  );
}