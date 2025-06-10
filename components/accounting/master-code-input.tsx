"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// このコンポーネントは削除されたSupabaseフックに依存していたため無効化
// 将来的にはServer Actionsベースで再実装予定

export interface MasterData {
  code: string;
  name: string;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}

interface MasterCodeInputProps {
  label: string;
  value: string;
  onChange: (code: string, name?: string) => void;
  onNameChange?: (name: string) => void;
  masterData: MasterData[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showNameField?: boolean;
  nameValue?: string;
  error?: string;
  className?: string;
}

export function MasterCodeInput({
  label,
  value,
  onChange,
  onNameChange,
  masterData,
  placeholder = "コードを選択または入力",
  disabled = false,
  required = false,
  showNameField = true,
  nameValue = "",
  error,
  className,
}: MasterCodeInputProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // コード入力時の名称自動設定
  const handleCodeChange = useCallback(
    (newCode: string) => {
      const selectedItem = masterData.find((item) => item.code === newCode);
      onChange(newCode, selectedItem?.name);
      if (selectedItem && onNameChange) {
        onNameChange(selectedItem.name);
      }
    },
    [masterData, onChange, onNameChange]
  );

  // 直接入力でのコード変更
  const handleDirectInput = (newCode: string) => {
    handleCodeChange(newCode);
    setSearchTerm("");
  };

  // フィルタ済みのマスタデータ
  const filteredData = masterData.filter(
    (item) =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 現在選択されているアイテムの名称を取得
  const selectedItem = masterData.find((item) => item.code === value);
  const displayName = nameValue || selectedItem?.name || "";

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <div className="flex space-x-2">
        {/* コード入力フィールド */}
        <div className="flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={disabled}
              >
                <span
                  className={cn("truncate", !value && "text-muted-foreground")}
                >
                  {value || placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput
                  placeholder="検索..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>見つかりません</CommandEmpty>
                  <CommandGroup>
                    {filteredData.map((item) => (
                      <CommandItem
                        key={item.code}
                        value={item.code}
                        onSelect={() => {
                          handleCodeChange(item.code);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === item.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{item.code}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.name}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* 直接入力も可能 */}
          <Input
            type="text"
            value={value}
            onChange={(e) => handleDirectInput(e.target.value)}
            placeholder="または直接入力"
            disabled={disabled}
            className="mt-1 text-xs"
          />
        </div>

        {/* 名称表示フィールド */}
        {showNameField && (
          <div className="flex-[2]">
            <Input
              type="text"
              value={displayName}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="名称"
              disabled={disabled}
              className="bg-muted"
              readOnly={!onNameChange}
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// 取引先コード入力用
export function PartnerCodeInput({
  value,
  onChange,
  partners,
  ...props
}: Omit<MasterCodeInputProps, "masterData" | "label"> & {
  partners: MasterData[];
}) {
  return (
    <MasterCodeInput
      label="取引先"
      masterData={partners}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

// 勘定科目コード入力用
export function AccountCodeInput({
  value,
  onChange,
  accounts,
  ...props
}: Omit<MasterCodeInputProps, "masterData" | "label"> & {
  accounts: MasterData[];
}) {
  return (
    <MasterCodeInput
      label="勘定科目"
      masterData={accounts}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

// 補助科目コード入力用
export function SubAccountCodeInput({
  value,
  onChange,
  subAccounts,
  accountCode,
  ...props
}: Omit<MasterCodeInputProps, "masterData" | "label"> & {
  subAccounts: MasterData[];
  accountCode?: string;
}) {
  // 指定された勘定科目に関連する補助科目のみフィルタ
  const filteredSubAccounts = accountCode
    ? subAccounts.filter((sub) =>
        // 実際のデータ構造に応じて調整が必要
        sub.code.startsWith(accountCode)
      )
    : subAccounts;

  return (
    <MasterCodeInput
      label="補助科目"
      masterData={filteredSubAccounts}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

// ==============================================================================
// リアルタイム変換機能付きコンポーネント（新機能）
// ==============================================================================

interface RealtimeCodeInputProps {
  label: string;
  value: string;
  onChange: (code: string, name?: string) => void;
  onNameChange?: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showNameField?: boolean;
  nameValue?: string;
  error?: string;
  className?: string;
  enableRealtime?: boolean;
  enableAutoComplete?: boolean;
}

/**
 * リアルタイム勘定科目コード入力
 */
export function RealtimeAccountCodeInput({
  value,
  onChange,
  onNameChange,
  nameValue,
  enableRealtime = true,
  enableAutoComplete = true,
  ...props
}: RealtimeCodeInputProps) {
  // 削除されたフックのスタブ
  const getNameByCode = async (code: string) => ({ success: false, error: "機能無効", data: null });
  const searchCodes = async (term: string, limit?: number) => ({ success: false, error: "機能無効", data: [] });
  const isLoading = false;
  const error = "このコンポーネントは一時的に無効化されています";

  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // コード入力時の名称自動取得
  useEffect(() => {
    if (value && enableAutoComplete) {
      getNameByCode(value).then((result) => {
        if (result.success && result.data && onNameChange) {
          onNameChange(result.data);
        }
      });
    }
  }, [value, getNameByCode, onNameChange, enableAutoComplete]);

  // オートコンプリート検索
  useEffect(() => {
    if (searchTerm && enableAutoComplete) {
      searchCodes(searchTerm, 10).then((result) => {
        if (result.success && result.data) {
          setSuggestions(result.data);
        }
      });
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, searchCodes, enableAutoComplete]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      onChange(newCode);
      setSearchTerm("");
    },
    [onChange]
  );

  return (
    <div className={cn("space-y-2", props.className)}>
      <Label className="text-sm font-medium">
        {props.label}
        {props.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <div className="flex space-x-2">
        {/* コード入力フィールド */}
        <div className="flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={props.disabled || isLoading}
              >
                <span
                  className={cn("truncate", !value && "text-muted-foreground")}
                >
                  {value || props.placeholder || "勘定科目コードを選択または入力"}
                </span>
                {isLoading ? (
                  <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="検索..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? "検索中..." : "見つかりません"}
                  </CommandEmpty>
                  <CommandGroup>
                    {suggestions.map((item) => (
                      <CommandItem
                        key={item.accountCode}
                        value={item.accountCode}
                        onSelect={() => {
                          handleCodeChange(item.accountCode);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === item.accountCode ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{item.accountCode}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.accountName}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* 直接入力 */}
          <Input
            type="text"
            value={value}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="または直接入力"
            disabled={props.disabled || isLoading}
            className="mt-1 text-xs"
          />
        </div>

        {/* 名称表示フィールド */}
        {props.showNameField && (
          <div className="flex-[2]">
            <Input
              type="text"
              value={nameValue || ""}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="勘定科目名称"
              disabled={props.disabled || isLoading}
              className="bg-muted"
              readOnly={!onNameChange}
            />
          </div>
        )}
      </div>

      {(error || props.error) && (
        <p className="text-sm text-destructive">
          {props.error || error}
        </p>
      )}
    </div>
  );
}

/**
 * リアルタイム取引先コード入力
 */
export function RealtimePartnerCodeInput({
  value,
  onChange,
  onNameChange,
  nameValue,
  enableRealtime = true,
  enableAutoComplete = true,
  ...props
}: RealtimeCodeInputProps) {
  // 削除されたフックのスタブ
  const getNameByCode = async (code: string) => ({ success: false, error: "機能無効", data: null });
  const searchCodes = async (term: string, limit?: number) => ({ success: false, error: "機能無効", data: [] });
  const isLoading = false;
  const error = "このコンポーネントは一時的に無効化されています";

  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // コード入力時の名称自動取得
  useEffect(() => {
    if (value && enableAutoComplete) {
      getNameByCode(value).then((result) => {
        if (result.success && result.data && onNameChange) {
          onNameChange(result.data);
        }
      });
    }
  }, [value, getNameByCode, onNameChange, enableAutoComplete]);

  // オートコンプリート検索
  useEffect(() => {
    if (searchTerm && enableAutoComplete) {
      searchCodes(searchTerm, 10).then((result) => {
        if (result.success && result.data) {
          setSuggestions(result.data);
        }
      });
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, searchCodes, enableAutoComplete]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      onChange(newCode);
      setSearchTerm("");
    },
    [onChange]
  );

  return (
    <div className={cn("space-y-2", props.className)}>
      <Label className="text-sm font-medium">
        {props.label}
        {props.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <div className="flex space-x-2">
        {/* コード入力フィールド */}
        <div className="flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={props.disabled || isLoading}
              >
                <span
                  className={cn("truncate", !value && "text-muted-foreground")}
                >
                  {value || props.placeholder || "取引先コードを選択または入力"}
                </span>
                {isLoading ? (
                  <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="検索..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? "検索中..." : "見つかりません"}
                  </CommandEmpty>
                  <CommandGroup>
                    {suggestions.map((item) => (
                      <CommandItem
                        key={item.partnerCode}
                        value={item.partnerCode}
                        onSelect={() => {
                          handleCodeChange(item.partnerCode);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === item.partnerCode ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{item.partnerCode}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.partnerName}
                          </span>
                          {item.partnerKana && (
                            <span className="text-xs text-muted-foreground truncate">
                              {item.partnerKana}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* 直接入力 */}
          <Input
            type="text"
            value={value}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="または直接入力"
            disabled={props.disabled || isLoading}
            className="mt-1 text-xs"
          />
        </div>

        {/* 名称表示フィールド */}
        {props.showNameField && (
          <div className="flex-[2]">
            <Input
              type="text"
              value={nameValue || ""}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="取引先名称"
              disabled={props.disabled || isLoading}
              className="bg-muted"
              readOnly={!onNameChange}
            />
          </div>
        )}
      </div>

      {(error || props.error) && (
        <p className="text-sm text-destructive">
          {props.error || error}
        </p>
      )}
    </div>
  );
}
