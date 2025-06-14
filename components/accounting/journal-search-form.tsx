/**
 * 仕訳検索フォームコンポーネント
 * ============================================================================
 * 仕訳一覧ページの検索・フィルタリング機能
 * ============================================================================
 */

"use client";

import { useState, useCallback } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateRangePicker } from "@/components/accounting/date-range-picker";
import { MasterSearchDialog } from "@/components/accounting/master-search-dialog";
import { useDebounce } from "@/lib/hooks/use-debounce";

export interface JournalSearchParams {
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  accountCode?: string;
  accountName?: string;
  partnerCode?: string;
  partnerName?: string;
}

interface JournalSearchFormProps {
  onSearch: (params: JournalSearchParams) => void;
  isSearching?: boolean;
}

export function JournalSearchForm({
  onSearch,
  isSearching = false,
}: JournalSearchFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerName, setPartnerName] = useState("");

  // デバウンス処理でリアルタイム検索
  const debouncedSearch = useDebounce(() => {
    handleSearch();
  }, 300);

  const handleSearch = useCallback(() => {
    const params: JournalSearchParams = {};

    if (searchTerm.trim()) params.searchTerm = searchTerm.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (accountCode.trim()) params.accountCode = accountCode.trim();
    if (partnerCode.trim()) params.partnerCode = partnerCode.trim();

    onSearch(params);
  }, [searchTerm, dateFrom, dateTo, accountCode, partnerCode, onSearch]);

  const handleReset = () => {
    setSearchTerm("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setAccountCode("");
    setAccountName("");
    setPartnerCode("");
    setPartnerName("");
    onSearch({});
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearch();
  };

  const handleDateRangeChange = (
    from: Date | undefined,
    to: Date | undefined
  ) => {
    setDateFrom(from);
    setDateTo(to);
    debouncedSearch();
  };

  const handleAccountSelect = (account: {
    accountCode: string;
    accountName: string;
  }) => {
    setAccountCode(account.accountCode);
    setAccountName(account.accountName);
    debouncedSearch();
  };

  const handlePartnerSelect = (partner: {
    partnerCode: string;
    partnerName: string;
  }) => {
    setPartnerCode(partner.partnerCode);
    setPartnerName(partner.partnerName);
    debouncedSearch();
  };

  return (
    <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm gap-0">
      <CardHeader className="bg-gradient-to-r from-muted/20 to-muted/10">
        <CardTitle className="text-2xl font-bold">仕訳検索</CardTitle>
        <CardDescription className="text-base">
          仕訳の検索条件を指定してください
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        {/* キーワード検索 */}
        <div className="space-y-2">
          <Label htmlFor="search-term">キーワード検索</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-term"
              type="text"
              placeholder="仕訳番号、摘要で検索..."
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 日付範囲 */}
        <div className="space-y-2">
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onRangeChange={handleDateRangeChange}
          />
        </div>

        {/* 勘定科目・取引先検索 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 勘定科目 */}
          <div className="space-y-2">
            <Label>勘定科目</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="科目コード"
                value={accountCode}
                onChange={(e) => {
                  setAccountCode(e.target.value);
                  if (!e.target.value) setAccountName("");
                }}
                className="w-32"
              />
              <Input
                type="text"
                placeholder="科目名"
                value={accountName}
                readOnly
                className="flex-1"
              />
              <MasterSearchDialog
                type="account"
                onSelect={handleAccountSelect}
                triggerText="検索"
                size="sm"
              />
            </div>
          </div>

          {/* 取引先 */}
          <div className="space-y-2">
            <Label>取引先</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="取引先コード"
                value={partnerCode}
                onChange={(e) => {
                  setPartnerCode(e.target.value);
                  if (!e.target.value) setPartnerName("");
                }}
                className="w-32"
              />
              <Input
                type="text"
                placeholder="取引先名"
                value={partnerName}
                readOnly
                className="flex-1"
              />
              <MasterSearchDialog
                type="partner"
                onSelect={handlePartnerSelect}
                triggerText="検索"
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6"
          >
            <Search className="h-4 w-4" />
            {isSearching ? "検索中..." : "検索"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSearching}
          >
            <RotateCcw className="h-4 w-4" />
            リセット
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
