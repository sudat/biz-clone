/**
 * 新しいマスタコード入力コンポーネント
 * ============================================================================
 * 一行レイアウト：コード入力欄 + 検索ボタン + 名称表示欄
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import { Search, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMasterName } from "@/app/actions/master-search";
import { MasterSearchDialog } from "./master-search-dialog";

interface MasterCodeInputProps {
  type: "account" | "subAccount" | "partner" | "analysisCode" | "department";
  value: string;
  onChange: (code: string, name?: string) => void;
  parentCode?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

const TYPE_LABELS = {
  account: "勘定科目",
  subAccount: "補助科目",
  partner: "取引先",
  analysisCode: "分析コード",
  department: "計上部門",
} as const;

export function MasterCodeInput({
  type,
  value,
  onChange,
  parentCode,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
}: MasterCodeInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [masterName, setMasterName] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // マスタ名称取得（戻り値で結果を返す）
  const fetchMasterName = async (
    code: string
  ): Promise<{ name: string | null; hasError: boolean }> => {
    if (!code) {
      setMasterName("");
      setHasError(false);
      return { name: null, hasError: false };
    }

    setIsLoading(true);
    try {
      const name = await getMasterName(type, code, parentCode);
      if (name) {
        setMasterName(name);
        setHasError(false);
        return { name, hasError: false };
      } else {
        setMasterName("");
        setHasError(true);
        return { name: null, hasError: true };
      }
    } catch (error) {
      console.error("マスタ名称取得エラー:", error);
      setMasterName("");
      setHasError(true);
      return { name: null, hasError: true };
    } finally {
      setIsLoading(false);
    }
  };

  // プロップスの値が変更されたとき（外部からの変更時のみ名称取得）
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
      fetchMasterName(value);
    }
  }, [value, type, parentCode]);

  // コード入力変更（親への通知は行わない）
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // 空の場合のみ即座に親に通知（マスタ名称をクリアするため）
    if (!newValue) {
      onChange(newValue);
      setMasterName("");
      setHasError(false);
    }
    // 入力中は親への通知は行わない
  };

  // フォーカスが外れた時に検索
  const handleBlur = async () => {
    const result = await fetchMasterName(inputValue);
    // 名称取得後に親に通知
    if (result.name && !result.hasError) {
      onChange(inputValue, result.name);
    } else {
      onChange(inputValue);
    }
  };

  // ダイアログからの選択
  const handleDialogSelect = (code: string, name: string) => {
    setInputValue(code);
    setMasterName(name);
    setHasError(false);
    onChange(code, name);
  };

  // エンターキー処理
  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const result = await fetchMasterName(inputValue);
      // 名称取得後に親に通知
      if (result.name && !result.hasError) {
        onChange(inputValue, result.name);
      } else {
        onChange(inputValue);
      }
    }
  };

  // バリデーション状態
  const getValidationState = () => {
    if (!inputValue) return "empty";
    if (isLoading) return "loading";
    if (hasError) return "error";
    if (masterName) return "valid";
    return "empty";
  };

  const validationState = getValidationState();

  return (
    <div className={cn("space-y-2", className)}>
      {/* メイン入力行 */}
      <div className="flex items-center gap-2">
        {/* コード入力欄 */}
        <div className="flex-shrink-0 w-32">
          <Input
            type="text"
            value={inputValue}
            onChange={handleCodeChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyPress}
            placeholder={placeholder || "コード"}
            disabled={disabled && !readOnly}
            readOnly={readOnly}
            className={cn(
              "font-mono text-center text-black disabled:opacity-80 read-only:opacity-80 read-only:cursor-default",
              validationState === "error" &&
                "border-red-300 focus:border-red-500",
              validationState === "valid" &&
                "border-green-300 focus:border-green-500"
            )}
          />
        </div>

        {/* 検索ボタン */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsDialogOpen(true)}
          disabled={
            disabled || readOnly || (type === "subAccount" && !parentCode)
          }
          className="flex-shrink-0 h-10 w-10"
          title={`${TYPE_LABELS[type]}を検索`}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* 名称表示欄 */}
        <div className="flex-1">
          <Input
            type="text"
            value={isLoading ? "検索中..." : masterName}
            readOnly={true}
            disabled={false}
            className={cn(
              "bg-slate-100 cursor-default text-black read-only:opacity-80",
              validationState === "error" && "text-red-600",
              validationState === "valid" && "text-black"
            )}
            placeholder={inputValue ? "マスタ名称" : `${TYPE_LABELS[type]}名称`}
          />
        </div>
      </div>

      {/* バリデーションメッセージ */}
      {validationState === "error" && inputValue && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span>
            {type === "subAccount" && !parentCode
              ? "親勘定科目を先に選択してください"
              : type === "account"
              ? "明細科目のみ選択可能です（集計科目は使用できません）"
              : "マスタに登録されていないコードです"}
          </span>
        </div>
      )}

      {/* 検索ダイアログ */}
      <MasterSearchDialog
        type={type}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelect={handleDialogSelect}
        parentCode={parentCode}
        selectedCode={inputValue}
      />
    </div>
  );
}
