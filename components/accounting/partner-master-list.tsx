"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Partner } from "@/lib/database/prisma";
import {
  getPartners,
  deletePartner,
  searchPartners,
} from "@/app/actions/partners";
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
import { PartnerMasterForm } from "@/components/accounting/partner-master-form";
import { Badge } from "@/components/ui/badge";

const searchFilters: SearchFilter[] = [
  {
    field: "partnerType",
    label: "取引先種別",
    type: "select",
    options: [
      { value: "得意先", label: "得意先" },
      { value: "仕入先", label: "仕入先" },
      { value: "その他", label: "その他" },
    ],
  },
];

const sortOptions: SortOption[] = [
  { field: "partnerCode", label: "コード順" },
  { field: "partnerName", label: "名称順" },
  { field: "partnerKana", label: "かな順" },
  { field: "partnerType", label: "種別順" },
  { field: "createdAt", label: "作成日順" },
];

export function PartnerMasterList() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "partnerCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const result = await getPartners();
      if (result.success && result.data) {
        setPartners(result.data || []);
      } else if (!result.success) {
        console.error("取引先データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("取引先データの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getPartners();
      if (result.success && result.data) {
        setPartners(result.data || []);
      } else if (!result.success) {
        console.error("取引先データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("取引先データの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // サーバーサイド検索
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await searchPartners(searchState.searchTerm, {
        partner_type: searchState.filters.partnerType,
        is_active: searchState.activeOnly ? true : undefined,
      });

      if (result.success) {
        setPartners(result.data || []);
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
  const filteredPartners = useMemo(() => {
    if (useServerSearch) {
      return partners; // サーバーサイド検索済みのデータをそのまま使用
    }

    return searchAndSort(partners, searchState, [
      "partnerCode",
      "partnerName",
      "partnerKana",
      "partnerType",
    ]);
  }, [partners, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(partners, filteredPartners);
  }, [partners, filteredPartners]);

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
      loadPartners();
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setIsDialogOpen(true);
  };

  const handleDelete = async (partner: Partner) => {
    if (confirm(`取引先「${partner.partnerName}」を削除しますか？`)) {
      try {
        const result = await deletePartner(partner.partnerCode);
        if (result.success) {
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
    setEditingPartner(null);
    await refreshData();
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
          placeholder="取引先コード・名称・かな・種別で検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="partnerCode"
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
                <TableHead>かな</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致する取引先が見つかりませんでした"
                      : "取引先が登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((partner) => (
                  <TableRow key={partner.partnerCode}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(partner.partnerCode)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(partner.partnerName)}
                    </TableCell>
                    <TableCell>
                      {renderHighlightedText(partner.partnerKana)}
                    </TableCell>
                    <TableCell>
                      {renderHighlightedText(partner.partnerType)}
                    </TableCell>
                    <TableCell>{partner.phone || ""}</TableCell>
                    <TableCell>
                      <Badge
                        variant={partner.isActive ? "default" : "secondary"}
                      >
                        {partner.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(partner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(partner)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? "取引先編集" : "新規取引先作成"}
            </DialogTitle>
            <DialogDescription>
              取引先の情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <PartnerMasterForm
            partner={editingPartner}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingPartner(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
