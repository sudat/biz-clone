"use client";

import {
  deleteWorkflowRoute,
  getWorkflowRoutes,
  searchWorkflowRoutes,
  type WorkflowRouteForClient,
} from "@/app/actions/workflow-routes";
import {
  MasterDataSearch,
  SearchFilter,
  SearchState,
  SortOption,
} from "@/components/accounting/master-data-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { showErrorToast, showSuccessToast } from "@/components/ui/error-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSystemError } from "@/lib/types/errors";
import {
  getSearchStats,
  highlightSearchTerm,
  searchAndSort,
} from "@/lib/utils/search-filter";
import { Loader2, Network, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const searchFilters: SearchFilter[] = [
  {
    field: "isActive",
    label: "ステータス",
    type: "select",
    options: [
      { value: "true", label: "有効" },
      { value: "false", label: "無効" },
    ],
  },
];

const sortOptions: SortOption[] = [
  { field: "routeCode", label: "コード順" },
  { field: "routeName", label: "名称順" },
  { field: "sortOrder", label: "表示順" },
  { field: "updatedAt", label: "更新日順" },
  { field: "createdAt", label: "作成日順" },
];

interface WorkflowRouteListProps {
  onEdit: (route: WorkflowRouteForClient) => void;
  refreshTrigger?: number;
}

export function WorkflowRouteList({
  onEdit,
  refreshTrigger = 0,
}: WorkflowRouteListProps) {
  const [routes, setRoutes] = useState<WorkflowRouteForClient[]>([]);
  const [originalRoutes, setOriginalRoutes] = useState<
    WorkflowRouteForClient[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "routeCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);

  // データ取得
  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const result = await getWorkflowRoutes();
      if (result.success && result.data) {
        setRoutes(result.data);
        setOriginalRoutes(result.data);
      } else {
        showErrorToast(
          createSystemError(
            result.error || "ワークフロールートの取得に失敗しました",
            "データ取得エラー"
          )
        );
      }
    } catch (error) {
      console.error("ワークフロールート取得エラー:", error);
      showErrorToast(
        createSystemError(
          "ワークフロールートの取得に失敗しました",
          error instanceof Error ? error.message : "不明なエラー"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getWorkflowRoutes();
      if (result.success && result.data) {
        setRoutes(result.data);
        setOriginalRoutes(result.data);
      } else {
        showErrorToast(
          createSystemError(
            result.error || "ワークフロールートの取得に失敗しました",
            "データ取得エラー"
          )
        );
      }
    } catch (error) {
      console.error("ワークフロールート取得エラー:", error);
      showErrorToast(
        createSystemError(
          "ワークフロールートの取得に失敗しました",
          error instanceof Error ? error.message : "不明なエラー"
        )
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  // サーバーサイド検索
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await searchWorkflowRoutes(searchState.searchTerm, {
        isActive: searchState.filters.isActive
          ? searchState.filters.isActive === "true"
          : searchState.activeOnly
          ? true
          : undefined,
      });

      if (result.success && result.data) {
        setRoutes(result.data);
      } else {
        showErrorToast(
          createSystemError(result.error || "検索に失敗しました", "検索エラー")
        );
      }
    } catch (error) {
      console.error("ワークフロールート検索エラー:", error);
      showErrorToast(
        createSystemError(
          "検索に失敗しました",
          error instanceof Error ? error.message : "不明なエラー"
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // クライアントサイド検索・フィルタリング
  const filteredRoutes = useMemo(() => {
    if (useServerSearch) {
      return routes; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      return searchAndSort(routes, searchState, [
        "routeCode",
        "routeName",
        "description",
      ]);
    }
  }, [routes, searchState, useServerSearch]);

  // 検索・フィルタ状態の変更ハンドラ
  const handleSearchChange = useCallback(
    (newSearchState: SearchState) => {
      setSearchState(newSearchState);
      if (useServerSearch) {
        performServerSearch(newSearchState);
      }
    },
    [useServerSearch, performServerSearch]
  );

  // 検索モード切り替え
  const toggleSearchMode = () => {
    setUseServerSearch(!useServerSearch);
    if (!useServerSearch) {
      performServerSearch(searchState);
    }
  };

  // 削除処理
  const handleDelete = async (route: WorkflowRouteForClient) => {
    if (!confirm(`「${route.routeName}」を削除しますか？`)) {
      return;
    }

    try {
      const result = await deleteWorkflowRoute(route.routeCode);
      if (result.success) {
        showSuccessToast("ワークフロールートを削除しました");
        refreshData(); // リストを更新
      } else {
        showErrorToast(
          result.error || createSystemError("削除に失敗しました", "削除エラー")
        );
      }
    } catch (error) {
      console.error("ワークフロールート削除エラー:", error);
      showErrorToast(
        createSystemError(
          "削除に失敗しました",
          error instanceof Error ? error.message : "不明なエラー"
        )
      );
    }
  };

  // フロー設定ページに遷移
  const openFlowConfig = (route: WorkflowRouteForClient) => {
    window.location.href = `/master/workflow-routes/${route.routeCode}`;
  };

  // 初期データ取得
  useEffect(() => {
    fetchRoutes();
  }, [refreshTrigger]);

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchChange(searchState);
    }
  };

  // ハイライトテキスト表示
  const renderHighlightedText = (text: string) => {
    if (!searchState.searchTerm || useServerSearch) {
      return text;
    }
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: highlightSearchTerm(text, searchState.searchTerm),
        }}
      />
    );
  };

  // 検索統計の取得
  const searchStats = useMemo(() => {
    if (useServerSearch) return null;
    return getSearchStats(routes, filteredRoutes);
  }, [routes, filteredRoutes, useServerSearch]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">読み込み中...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 検索・フィルタ・ソート */}
      <MasterDataSearch
        placeholder="ルートコード、ルート名、説明で検索..."
        searchFilters={searchFilters}
        sortOptions={sortOptions}
        defaultSortField="routeCode"
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
          {searchStats && !useServerSearch ? (
            <span>
              {searchStats.filtered} / {searchStats.total} 件表示
            </span>
          ) : (
            <span>{filteredRoutes.length} 件</span>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ルートコード</TableHead>
              <TableHead>ルート名</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>表示順</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>更新日時</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoutes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchState.searchTerm ||
                  Object.keys(searchState.filters).length > 0 ||
                  searchState.activeOnly
                    ? "検索条件に一致するワークフロールートが見つかりませんでした"
                    : "ワークフロールートが登録されていません"}
                </TableCell>
              </TableRow>
            ) : (
              filteredRoutes.map((route) => (
                <TableRow key={route.routeCode}>
                  <TableCell className="font-medium">
                    {renderHighlightedText(route.routeCode)}
                  </TableCell>
                  <TableCell>
                    {renderHighlightedText(route.routeName)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {route.description
                      ? renderHighlightedText(route.description)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {route.sortOrder !== null ? route.sortOrder : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={route.isActive ? "default" : "secondary"}>
                      {route.isActive ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(route.updatedAt).toLocaleString("ja-JP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(route)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(route)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openFlowConfig(route)}
                      >
                        <Network className="h-4 w-4" />
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
  );
}
