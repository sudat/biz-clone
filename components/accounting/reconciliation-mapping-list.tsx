"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getReconciliationMappings,
  searchReconciliationMappings,
  deleteReconciliationMapping,
  type ReconciliationMappingForClient,
} from "@/app/actions/reconciliation-mappings";
import {
  searchAndSort,
  getSearchStats,
  highlightSearchTerm,
} from "@/lib/utils/search-filter";
import {
  MasterDataSearch,
  SearchFilter,
  SortOption,
  SearchState,
} from "@/components/accounting/master-data-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { showErrorToast } from "@/components/ui/error-toast";
import { ErrorType } from "@/lib/types/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReconciliationMappingForm } from "@/components/accounting/reconciliation-mapping-form";
import { Badge } from "@/components/ui/badge";

const searchFilters: SearchFilter[] = [
  {
    field: "departmentCode",
    label: "計上部門コード",
    type: "text",
  },
  {
    field: "accountCode",
    label: "勘定科目コード",
    type: "text",
  },
  {
    field: "counterDepartmentCode",
    label: "相手計上部門コード",
    type: "text",
  },
  {
    field: "counterAccountCode",
    label: "相手勘定科目コード",
    type: "text",
  },
];

const sortOptions: SortOption[] = [
  { field: "departmentCode", label: "計上部門コード順" },
  { field: "accountCode", label: "勘定科目コード順" },
  { field: "counterDepartmentCode", label: "相手計上部門コード順" },
  { field: "counterAccountCode", label: "相手勘定科目コード順" },
  { field: "createdAt", label: "作成日順" },
];

export function ReconciliationMappingList() {
  const [mappings, setMappings] = useState<ReconciliationMappingForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "departmentCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingMapping, setEditingMapping] = useState<ReconciliationMappingForClient | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getReconciliationMappings();
      if (result.success && result.data) {
        setMappings(result.data || []);
      } else if (!result.success) {
        console.error("勘定照合マスタデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("勘定照合マスタデータの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (mappings.length === 0) {
      loadMappings();
    }
  }, [mappings.length]);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const result = await getReconciliationMappings();
      if (result.success && result.data) {
        setMappings(result.data || []);
      } else if (!result.success) {
        console.error("勘定照合マスタデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("勘定照合マスタデータの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用）
  const performServerSearch = useCallback(
    async (searchState: SearchState) => {
      setLoading(true);
      try {
        const result = await searchReconciliationMappings(searchState.searchTerm, {
          departmentCode: searchState.filters.departmentCode,
          accountCode: searchState.filters.accountCode,
          counterDepartmentCode: searchState.filters.counterDepartmentCode,
          counterAccountCode: searchState.filters.counterAccountCode,
          isActive: searchState.activeOnly ? true : undefined,
        });

        if (result.success) {
          setMappings(result.data || []);
        } else {
          console.error("検索エラー:", result.error);
        }
      } catch (error) {
        console.error("検索エラー:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // クライアントサイド検索・フィルタリング
  const filteredMappings = useMemo(() => {
    let processedMappings = mappings;

    if (useServerSearch) {
      processedMappings = mappings; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      processedMappings = searchAndSort(mappings, searchState, [
        "departmentCode",
        "accountCode",
        "counterDepartmentCode",
        "counterAccountCode",
        "description",
      ]);
    }

    return processedMappings;
  }, [mappings, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(mappings, filteredMappings);
  }, [mappings, filteredMappings]);

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
      loadMappings();
    }
  };

  const handleEdit = (mapping: ReconciliationMappingForClient) => {
    setEditingMapping(mapping);
    setIsDialogOpen(true);
  };

  const handleDelete = async (mapping: ReconciliationMappingForClient) => {
    if (confirm(`勘定照合マスタ「${mapping.departmentCode}-${mapping.accountCode} → ${mapping.counterDepartmentCode}-${mapping.counterAccountCode}」を削除しますか？`)) {
      try {
        const result = await deleteReconciliationMapping(mapping.mappingId);
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
    setEditingMapping(null);
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
          placeholder="部門コード・勘定科目コード・説明で検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="departmentCode"
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
                <TableHead>計上部門</TableHead>
                <TableHead>勘定科目</TableHead>
                <TableHead>相手計上部門</TableHead>
                <TableHead>相手勘定科目</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致する勘定照合マスタが見つかりませんでした"
                      : "勘定照合マスタが登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMappings.map((mapping) => (
                  <TableRow key={mapping.mappingId}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          {renderHighlightedText(mapping.departmentCode)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {mapping.departmentName || "不明"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          {renderHighlightedText(mapping.accountCode)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {mapping.accountName || "不明"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          {renderHighlightedText(mapping.counterDepartmentCode)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {mapping.counterDepartmentName || "不明"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          {renderHighlightedText(mapping.counterAccountCode)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {mapping.counterAccountName || "不明"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm">
                        {mapping.description ? renderHighlightedText(mapping.description) : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={mapping.isActive ? "default" : "outline"}
                      >
                        {mapping.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleEdit(mapping)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleDelete(mapping)}
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
              {editingMapping ? "勘定照合マスタ編集" : "新規勘定照合マスタ作成"}
            </DialogTitle>
            <DialogDescription>
              勘定照合マスタの情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <ReconciliationMappingForm
            mapping={editingMapping}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingMapping(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReconciliationMappingList;