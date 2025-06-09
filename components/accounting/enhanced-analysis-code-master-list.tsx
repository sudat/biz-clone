"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Database } from "@/lib/database/types";
import { AnalysisCodeDataAdapter } from "@/lib/adapters/client-data-adapter";
// import { searchAnalysisCodes } from "@/lib/supabase/search-services"; // 削除予定
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

type AnalysisCode = Database["public"]["Tables"]["analysis_codes"]["Row"];

export function EnhancedAnalysisCodeMasterList() {
  const [analysisCodes, setAnalysisCodes] = useState<AnalysisCode[]>([]);
  const [analysisTypes, setAnalysisTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "analysis_code",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingAnalysisCode, setEditingAnalysisCode] =
    useState<AnalysisCode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);

  useEffect(() => {
    loadAnalysisCodes();
    loadAnalysisTypes();
  }, []);

  const loadAnalysisCodes = async () => {
    setLoading(true);
    try {
      const result = await AnalysisCodeDataAdapter.getAnalysisCodes();
      if (result.success && result.data) {
        setAnalysisCodes(result.data);
      } else if (!result.success) {
        console.error("分析コードデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("分析コードデータの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisTypes = async () => {
    try {
      const result = await AnalysisCodeDataAdapter.getAnalysisTypes();
      if (result.success && result.data) {
        setAnalysisTypes(result.data);
      }
    } catch (error) {
      console.error("分析種別の取得エラー:", error);
    }
  };

  // 動的に生成された検索フィルター
  const searchFilters: SearchFilter[] = useMemo(
    () => [
      {
        field: "analysis_type",
        label: "分析種別",
        type: "select",
        options: analysisTypes.map((type) => ({ value: type, label: type })),
      },
    ],
    [analysisTypes]
  );

  const sortOptions: SortOption[] = [
    { field: "analysis_code", label: "コード順" },
    { field: "analysis_name", label: "名称順" },
    { field: "analysis_type", label: "種別順" },
    { field: "sort_order", label: "表示順序" },
    { field: "created_at", label: "作成日順" },
  ];

  // サーバーサイド検索（Supabase Full Text Search使用）
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await AnalysisCodeDataAdapter.searchAnalysisCodes(
        searchState.searchTerm,
        {
          analysis_type: searchState.filters.analysis_type,
          is_active: searchState.activeOnly ? true : undefined,
        }
      );

      if (result.success) {
        setAnalysisCodes(result.data);
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
      "analysis_code",
      "analysis_name",
      "analysis_type",
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
    if (
      confirm(`分析コード「${analysisCode.analysis_name}」を削除しますか？`)
    ) {
      try {
        const result = await AnalysisCodeDataAdapter.deleteAnalysisCode(
          analysisCode.analysis_code
        );
        if (result.success) {
          await loadAnalysisCodes();
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
    await loadAnalysisCodes();
    await loadAnalysisTypes(); // 新しい種別が追加された可能性があるため
  };

  const renderHighlightedText = (text: string | null) => {
    if (!text || !searchState.searchTerm) return text || "";
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: highlightSearchTerm(text, searchState.searchTerm),
        }}
      />
    );
  };

  if (loading) {
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
          defaultSortField="analysis_code"
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
                <TableHead>表示順序</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalysisCodes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
                  <TableRow key={analysisCode.analysis_code}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(analysisCode.analysis_code)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(analysisCode.analysis_name)}
                    </TableCell>
                    <TableCell>
                      {renderHighlightedText(analysisCode.analysis_type)}
                    </TableCell>
                    <TableCell>{analysisCode.sort_order || ""}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          analysisCode.is_active ? "default" : "secondary"
                        }
                      >
                        {analysisCode.is_active ? "有効" : "無効"}
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
