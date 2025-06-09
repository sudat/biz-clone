"use client";

import { useState, useEffect } from "react";
import { Search, Filter, X, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface SearchFilter {
  field: string;
  label: string;
  type: "text" | "select" | "boolean";
  options?: { value: string; label: string }[];
}

export interface SortOption {
  field: string;
  label: string;
}

export interface SearchState {
  searchTerm: string;
  filters: Record<string, any>;
  sortField: string;
  sortDirection: "asc" | "desc";
  activeOnly: boolean;
}

interface MasterDataSearchProps {
  placeholder?: string;
  searchFilters?: SearchFilter[];
  sortOptions?: SortOption[];
  defaultSortField?: string;
  onSearchChange: (searchState: SearchState) => void;
  className?: string;
}

export function MasterDataSearch({
  placeholder = "検索...",
  searchFilters = [],
  sortOptions = [],
  defaultSortField = "",
  onSearchChange,
  className = "",
}: MasterDataSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortField, setSortField] = useState(defaultSortField);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeOnly, setActiveOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // アクティブなフィルターの数を計算
  const activeFilterCount =
    Object.keys(filters).filter(
      (key) => filters[key] !== undefined && filters[key] !== ""
    ).length + (activeOnly ? 1 : 0);

  useEffect(() => {
    const searchState: SearchState = {
      searchTerm,
      filters,
      sortField,
      sortDirection,
      activeOnly,
    };
    onSearchChange(searchState);
  }, [
    searchTerm,
    filters,
    sortField,
    sortDirection,
    activeOnly,
    onSearchChange,
  ]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilter = (field: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setActiveOnly(false);
    setSearchTerm("");
  };

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 検索バー */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* フィルターボタン */}
        {searchFilters.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                フィルタ
                {activeFilterCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">フィルター設定</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-auto p-1 text-xs"
                    >
                      すべてクリア
                    </Button>
                  )}
                </div>

                {/* 有効状態フィルター */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="active-only" className="text-sm">
                    有効のみ表示
                  </Label>
                  <Switch
                    id="active-only"
                    checked={activeOnly}
                    onCheckedChange={setActiveOnly}
                  />
                </div>

                {/* カスタムフィルター */}
                {searchFilters.map((filter) => (
                  <div key={filter.field} className="space-y-2">
                    <Label className="text-sm">{filter.label}</Label>
                    {filter.type === "text" && (
                      <Input
                        placeholder={`${filter.label}で絞り込み`}
                        value={filters[filter.field] || ""}
                        onChange={(e) =>
                          handleFilterChange(filter.field, e.target.value)
                        }
                      />
                    )}
                    {filter.type === "select" && filter.options && (
                      <Select
                        value={filters[filter.field] || ""}
                        onValueChange={(value) =>
                          handleFilterChange(filter.field, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">すべて</SelectItem>
                          {filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {filter.type === "boolean" && (
                      <Switch
                        checked={filters[filter.field] || false}
                        onCheckedChange={(checked) =>
                          handleFilterChange(filter.field, checked)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* ソートボタン */}
        {sortOptions.length > 0 && (
          <div className="flex gap-1">
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.field} value={option.field}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSort}
              disabled={!sortField}
            >
              {sortDirection === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* アクティブフィルターの表示 */}
      {(activeFilterCount > 0 || searchTerm) && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              検索: {searchTerm}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSearchTerm("")}
              />
            </Badge>
          )}
          {activeOnly && (
            <Badge variant="secondary" className="flex items-center gap-1">
              有効のみ
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setActiveOnly(false)}
              />
            </Badge>
          )}
          {Object.entries(filters).map(([field, value]) => {
            if (!value) return null;
            const filter = searchFilters.find((f) => f.field === field);
            if (!filter) return null;

            return (
              <Badge
                key={field}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {filter.label}: {value}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter(field)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
