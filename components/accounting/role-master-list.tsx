"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getRoles,
  searchRoles,
  deleteRole,
  type RoleForClient,
} from "@/app/actions/roles";
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
import { RoleMasterForm } from "@/components/accounting/role-master-form";
import { Badge } from "@/components/ui/badge";

const searchFilters: SearchFilter[] = [];

const sortOptions: SortOption[] = [
  { field: "roleCode", label: "コード順" },
  { field: "roleName", label: "名称順" },
  { field: "createdAt", label: "作成日順" },
];

export function RoleMasterList() {
  const [roles, setRoles] = useState<RoleForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "roleCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingRole, setEditingRole] = useState<RoleForClient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getRoles();
      if (result.success && result.data) {
        setRoles(result.data || []);
      } else if (!result.success) {
        console.error("ロールデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("ロールデータの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (roles.length === 0) {
      loadRoles();
    }
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const result = await getRoles();
      if (result.success && result.data) {
        setRoles(result.data || []);
      } else if (!result.success) {
        console.error("ロールデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("ロールデータの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用）
  const performServerSearch = useCallback(
    async (searchState: SearchState) => {
      setLoading(true);
      try {
        const result = await searchRoles(searchState.searchTerm, {
          isActive: searchState.activeOnly ? true : undefined,
        });

        if (result.success) {
          setRoles(result.data || []);
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
  const filteredRoles = useMemo(() => {
    let processedRoles = roles;

    if (useServerSearch) {
      processedRoles = roles; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      processedRoles = searchAndSort(roles, searchState, [
        "roleCode",
        "roleName",
        "description",
      ]);
    }

    return processedRoles;
  }, [roles, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(roles, filteredRoles);
  }, [roles, filteredRoles]);

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
      loadRoles();
    }
  };

  const handleEdit = (role: RoleForClient) => {
    setEditingRole(role);
    setIsDialogOpen(true);
  };

  const handleDelete = async (role: RoleForClient) => {
    if (confirm(`ロール「${role.roleName}」を削除しますか？`)) {
      try {
        const result = await deleteRole(role.roleCode);
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
    setEditingRole(null);
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
          placeholder="ロールコード・名称・説明で検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="roleCode"
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
                <TableHead>説明</TableHead>
                <TableHead>並び順</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致するロールが見つかりませんでした"
                      : "ロールが登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => (
                  <TableRow key={role.roleCode}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(role.roleCode)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(role.roleName)}
                    </TableCell>
                    <TableCell>
                      {role.description ? (
                        renderHighlightedText(role.description)
                      ) : (
                        <span className="text-muted-foreground text-sm">未設定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {role.sortOrder !== null ? role.sortOrder : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={role.isActive ? "default" : "outline"}
                      >
                        {role.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(role)}
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
              {editingRole ? "ロール編集" : "新規ロール作成"}
            </DialogTitle>
            <DialogDescription>
              ロールの情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <RoleMasterForm
            role={editingRole}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingRole(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RoleMasterList;