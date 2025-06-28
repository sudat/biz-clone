"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getDepartments,
  searchDepartments,
  deleteDepartment,
  type DepartmentForClient,
} from "@/app/actions/departments";
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
import { DepartmentMasterForm } from "@/components/accounting/department-master-form";
import { Badge } from "@/components/ui/badge";

const searchFilters: SearchFilter[] = [
  {
    field: "isActive",
    label: "状態",
    type: "select",
    options: [
      { value: "true", label: "有効" },
      { value: "false", label: "無効" },
    ],
  },
];

const sortOptions: SortOption[] = [
  { field: "departmentCode", label: "部門コード順" },
  { field: "departmentName", label: "部門名順" },
  { field: "sortOrder", label: "並び順" },
  { field: "createdAt", label: "作成日順" },
];

export function DepartmentMasterList() {
  const [departments, setDepartments] = useState<DepartmentForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "departmentCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingDepartment, setEditingDepartment] = useState<DepartmentForClient | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getDepartments();
      if (result.success && result.data) {
        setDepartments(result.data || []);
      } else if (!result.success) {
        console.error("計上部門データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("計上部門データの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (departments.length === 0) {
      loadDepartments();
    }
  }, [departments.length]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const result = await getDepartments();
      if (result.success && result.data) {
        setDepartments(result.data || []);
      } else if (!result.success) {
        console.error("計上部門データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("計上部門データの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用）
  const performServerSearch = useCallback(
    async (searchState: SearchState) => {
      setLoading(true);
      try {
        // フィルタから状態を取得
        const isActiveFilter = searchState.filters.isActive;
        let isActiveValue: boolean | undefined;
        
        if (isActiveFilter === "true") {
          isActiveValue = true;
        } else if (isActiveFilter === "false") {
          isActiveValue = false;
        } else if (searchState.activeOnly) {
          isActiveValue = true;
        } else {
          isActiveValue = undefined; // すべて表示
        }

        const result = await searchDepartments(searchState.searchTerm, {
          isActive: isActiveValue,
        });

        if (result.success) {
          setDepartments(result.data || []);
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
  const filteredDepartments = useMemo(() => {
    if (useServerSearch) {
      return departments; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      // フィルタを変換（文字列のブール値を実際のブール値に変換）
      const transformedSearchState = {
        ...searchState,
        filters: {
          ...searchState.filters,
          ...(searchState.filters.isActive && {
            isActive: searchState.filters.isActive === "true",
          }),
        },
      };
      
      return searchAndSort(departments, transformedSearchState, [
        "departmentCode",
        "departmentName",
      ]);
    }
  }, [departments, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(departments, filteredDepartments);
  }, [departments, filteredDepartments]);

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
      loadDepartments();
    }
  };

  const handleEdit = (department: DepartmentForClient) => {
    setEditingDepartment(department);
    setIsDialogOpen(true);
  };

  const handleDelete = async (department: DepartmentForClient) => {
    if (confirm(`計上部門「${department.departmentName}」を削除しますか？`)) {
      try {
        const result = await deleteDepartment(department.departmentCode);
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
    setEditingDepartment(null);
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
          placeholder="部門コード・部門名で検索..."
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
                <TableHead>部門コード</TableHead>
                <TableHead>部門名</TableHead>
                <TableHead>並び順</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致する計上部門が見つかりませんでした"
                      : "計上部門が登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((department) => (
                  <TableRow key={department.departmentCode}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(department.departmentCode)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(department.departmentName)}
                    </TableCell>
                    <TableCell>
                      {department.sortOrder !== null ? (
                        <span className="text-sm">{department.sortOrder}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          未設定
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={department.isActive ? "default" : "outline"}
                      >
                        {department.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleEdit(department)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleDelete(department)}
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
              {editingDepartment ? "計上部門編集" : "新規計上部門作成"}
            </DialogTitle>
            <DialogDescription>
              計上部門の情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <DepartmentMasterForm
            department={editingDepartment}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingDepartment(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DepartmentMasterList;