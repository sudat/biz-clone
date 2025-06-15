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
import { useDebounce } from "@/lib/hooks/use-debounce";

export interface JournalSearchParams {
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
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

  // デバウンス処理でリアルタイム検索
  const debouncedSearch = useDebounce(() => {
    handleSearch();
  }, 300);

  const handleSearch = useCallback(() => {
    const params: JournalSearchParams = {};

    if (searchTerm.trim()) params.searchTerm = searchTerm.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    onSearch(params);
  }, [searchTerm, dateFrom, dateTo, onSearch]);

  const handleReset = () => {
    setSearchTerm("");
    setDateFrom(undefined);
    setDateTo(undefined);
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
