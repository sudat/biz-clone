"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getAnalysisCodes, searchAnalysisCodes, deleteAnalysisCode } from "@/app/actions/analysis-codes";
import type { AnalysisCode } from "@/lib/database/prisma";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnalysisCodeMasterForm } from "@/components/accounting/analysis-code-master-form";
import { Badge } from "@/components/ui/badge";

const searchFilters: SearchFilter[] = [
  {
    field: "analysisType",
    label: "分析種別",
    type: "select",
    options: [
      { value: "部門", label: "部門" },
      { value: "プロジェクト", label: "プロジェクト" },
      { value: "製品", label: "製品" },
      { value: "地域", label: "地域" },
      { value: "顧客", label: "顧客" },
    ],
  },
];

const sortOptions: SortOption[] = [
  { field: "analysisCode", label: "コード順" },
  { field: "analysisName", label: "名称順" },
  { field: "analysisType", label: "種別順" },
  { field: "createdAt", label: "作成日順" },
];

export function AnalysisCodeMasterList() {
  const [analysisCodes, setAnalysisCodes] = useState<AnalysisCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "analysisCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingAnalysisCode, setEditingAnalysisCode] = useState<AnalysisCode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getAnalysisCodes();
      if (result.success && result.data) {
        setAnalysisCodes(result.data || []);
      } else if (!result.success) {
        console.error("分析コードデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("分析コードデータの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (analysisCodes.length === 0) {
      loadAnalysisCodes();
    }
  }, []);

  const loadAnalysisCodes = async () => {
    setLoading(true);
    try {
      const result = await getAnalysisCodes();
      if (result.success && result.data) {
        setAnalysisCodes(result.data || []);
      } else if (!result.success) {
        console.error("分析コードデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("分析コードデータの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用）
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await searchAnalysisCodes(
        searchState.searchTerm,
        {
          analysis_type: searchState.filters.analysisType,
          is_active: searchState.activeOnly ? true : undefined,
        }
      );

      if (result.success) {
        setAnalysisCodes(result.data || []);
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
  const filteredAnalysisCodes = useMemo(() => {
    if (useServerSearch) {
      return analysisCodes; // サーバーサイド検索済みのデータをそのまま使用
    }

    return searchAndSort(analysisCodes, searchState, [
      "analysisCode",
      "analysisName",
      "analysisType",
    ]);
  }, [analysisCodes, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(analysisCodes, filteredAnalysisCodes);
  }, [analysisCodes, filteredAnalysisCodes]);

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
      loadAnalysisCodes();
    }
  };

  const handleEdit = (analysisCode: AnalysisCode) => {
    setEditingAnalysisCode(analysisCode);
    setIsDialogOpen(true);
  };

  const handleDelete = async (analysisCode: AnalysisCode) => {
    if (confirm(`分析コード「${analysisCode.analysisName}」を削除しますか？`)) {
      try {
        const result = await deleteAnalysisCode(analysisCode.analysisCode);
        if (result.success) {
          // 削除成功時はリフレッシュ
          await refreshData();
        } else {
          alert("削除エラー: " + result.error);
        }
      } catch (error) {
        alert("削除エラー: " + error);
      }
    }
  };

  const handleFormSubmit = async () => {
    setIsDialogOpen(false);
    setEditingAnalysisCode(null);
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
          placeholder="分析コード・名称・種別で検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="analysisCode"
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
                <TableHead>種別</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalysisCodes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致する分析コードが見つかりませんでした"
                      : "分析コードが登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnalysisCodes.map((analysisCode) => (
                  <TableRow key={analysisCode.analysisCode}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(analysisCode.analysisCode)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(analysisCode.analysisName)}
                    </TableCell>
                    <TableCell>
                      {renderHighlightedText(analysisCode.analysisType)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={analysisCode.isActive ? "default" : "secondary"}
                      >
                        {analysisCode.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(analysisCode)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(analysisCode)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAnalysisCode ? "分析コード編集" : "新規分析コード作成"}
            </DialogTitle>
            <DialogDescription>
              分析コードの情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <AnalysisCodeMasterForm
            analysisCode={editingAnalysisCode}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingAnalysisCode(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}