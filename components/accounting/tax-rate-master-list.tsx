"use client";

import {
  deleteTaxRate,
  getTaxRates,
  searchTaxRates,
} from "@/app/actions/tax-rates";
import type { TaxRateForClient } from "@/types/unified";
import {
  MasterDataSearch,
  SearchFilter,
  SearchState,
  SortOption,
} from "@/components/accounting/master-data-search";
import { TaxRateMasterForm } from "@/components/accounting/tax-rate-master-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSearchStats,
  highlightSearchTerm,
  searchAndSort,
} from "@/lib/utils/search-filter";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showErrorToast } from "@/components/ui/error-toast";
import { ErrorType } from "@/lib/types/errors";

const searchFilters: SearchFilter[] = [
  {
    field: "taxRate",
    label: "税率",
    type: "select",
    options: [
      { value: "0", label: "0%" },
      { value: "8", label: "8%" },
      { value: "10", label: "10%" },
      { value: "other", label: "その他" },
    ],
  },
];

const sortOptions: SortOption[] = [
  { field: "taxCode", label: "コード順" },
  { field: "taxName", label: "名称順" },
  { field: "taxRate", label: "税率順" },
  { field: "sortOrder", label: "並び順" },
  { field: "createdAt", label: "作成日順" },
];

export function TaxRateMasterList() {
  const [taxRates, setTaxRates] = useState<TaxRateForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "taxCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRateForClient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getTaxRates();
      if (result.success && result.data) {
        setTaxRates(result.data || []);
      } else if (!result.success) {
        console.error("税区分データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("税区分データの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (taxRates.length === 0) {
      loadTaxRates();
    }
  }, [taxRates.length]);

  const loadTaxRates = async () => {
    setLoading(true);
    try {
      const result = await getTaxRates();
      if (result.success && result.data) {
        setTaxRates(result.data || []);
      } else if (!result.success) {
        console.error("税区分データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("税区分データの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用）
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await searchTaxRates(searchState.searchTerm, {
        isActive: searchState.activeOnly ? true : undefined,
        taxRate: searchState.filters.taxRate || undefined,
      });

      if (result.success) {
        setTaxRates(result.data || []);
      } else {
        console.error("検索エラー:", result.error);
      }
    } catch (error) {
      console.error("検索エラー:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // クライアントサイド検索・フィルタリング
  const filteredTaxRates = useMemo(() => {
    let processedTaxRates = taxRates;

    if (useServerSearch) {
      processedTaxRates = taxRates; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      // まず基本的な検索とソートを適用
      processedTaxRates = searchAndSort(taxRates, searchState, [
        "taxCode",
        "taxName",
      ]);

      // 税率フィルタの適用
      if (searchState.filters.taxRate) {
        const filterValue = searchState.filters.taxRate;
        processedTaxRates = processedTaxRates.filter((taxRate) => {
          if (filterValue === "0") {
            return taxRate.taxRate === 0;
          } else if (filterValue === "8") {
            return taxRate.taxRate === 8;
          } else if (filterValue === "10") {
            return taxRate.taxRate === 10;
          } else if (filterValue === "other") {
            return ![0, 8, 10].includes(taxRate.taxRate);
          }
          return true;
        });
      }
    }

    return processedTaxRates;
  }, [taxRates, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(taxRates, filteredTaxRates);
  }, [taxRates, filteredTaxRates]);

  const handleSearchChange = useCallback(
    (newSearchState: SearchState) => {
      setSearchState(newSearchState);

      // 複雑な検索の場合はサーバーサイド検索を使用
      if (
        newSearchState.searchTerm.length > 2 ||
        Object.keys(newSearchState.filters).length > 0
      ) {
        if (useServerSearch) {
          performServerSearch(newSearchState);
        }
      }
    },
    [useServerSearch, performServerSearch]
  );

  const toggleSearchMode = () => {
    setUseServerSearch(!useServerSearch);
    if (!useServerSearch) {
      performServerSearch(searchState);
    } else {
      loadTaxRates();
    }
  };

  const handleEdit = (taxRate: TaxRateForClient) => {
    setEditingTaxRate(taxRate);
    setIsDialogOpen(true);
  };

  const handleDelete = async (taxRate: TaxRateForClient) => {
    if (confirm(`税区分「${taxRate.taxName}」を削除しますか？`)) {
      try {
        const result = await deleteTaxRate(taxRate.taxCode);
        if (result.success) {
          // 削除成功時はリフレッシュ
          await refreshData();
        } else {
          // エラーレスポンスがある場合はそれを使用し、そうでなければデフォルトメッセージ
          const errorInfo = result.error || {
            type: ErrorType.BUSINESS,
            message: "削除に失敗しました",
            details: { retryable: false }
          };
          showErrorToast(errorInfo);
        }
      } catch (error) {
        showErrorToast({
          type: ErrorType.SYSTEM,
          message: "削除処理中にエラーが発生しました",
          details: { 
            originalError: error instanceof Error ? error.message : String(error),
            retryable: true 
          }
        });
      }
    }
  };

  const handleFormSubmit = async () => {
    setIsDialogOpen(false);
    setEditingTaxRate(null);
    // フォーム送信後は手動でリフレッシュ
    await refreshData();
  };

  const renderHighlightedText = (text: string) => {
    if (!searchState.searchTerm) return text;
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: highlightSearchTerm(text, searchState.searchTerm),
        }}
      />
    );
  };

  // 税率のフォーマット表示
  const formatTaxRate = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* 検索・フィルタコンポーネント */}
        <MasterDataSearch
          placeholder="税区分コード・名称で検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="taxCode"
          onSearchChange={handleSearchChange}
        />

        {/* 検索モード切り替えと統計 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Badge variant={useServerSearch ? "default" : "secondary"}>
              {useServerSearch ? "サーバー検索" : "クライアント検索"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSearchMode}
              className="h-auto p-1"
            >
              切り替え
            </Button>
            {/* リフレッシュボタン */}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
              className="h-auto p-1"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              更新
            </Button>
          </div>
          <div>
            {searchStats.filtered !== searchStats.total && (
              <span>
                {searchStats.filtered} / {searchStats.total} 件表示
              </span>
            )}
            {searchStats.filtered === searchStats.total && (
              <span>{searchStats.total} 件</span>
            )}
          </div>
        </div>

        {/* テーブル */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>コード</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>税率</TableHead>
                <TableHead>並び順</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTaxRates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致する税区分が見つかりませんでした"
                      : "税区分が登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTaxRates.map((taxRate) => (
                  <TableRow key={taxRate.taxCode}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(taxRate.taxCode)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(taxRate.taxName)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatTaxRate(taxRate.taxRate)}
                    </TableCell>
                    <TableCell>
                      {taxRate.sortOrder !== null ? taxRate.sortOrder : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={taxRate.isActive ? "default" : "outline"}>
                        {taxRate.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleEdit(taxRate)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleDelete(taxRate)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>
              {editingTaxRate ? "税区分編集" : "新規税区分作成"}
            </DialogTitle>
            <DialogDescription>
              税区分の情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <TaxRateMasterForm
            taxRate={editingTaxRate}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingTaxRate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TaxRateMasterList;