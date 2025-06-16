"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getWorkflowOrganizations,
  searchWorkflowOrganizations,
  deleteWorkflowOrganization,
  type WorkflowOrganizationForClient,
} from "@/app/actions/workflow-organizations";
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
import { Pencil, Trash2, RefreshCw, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkflowOrganizationForm } from "@/components/accounting/workflow-organization-form";
import { UserAssignmentDialog } from "@/components/accounting/user-assignment-dialog";
import { Badge } from "@/components/ui/badge";

const searchFilters: SearchFilter[] = [
  {
    field: "hasUsers",
    label: "所属ユーザー",
    type: "select",
    options: [
      { value: "withUsers", label: "ユーザーあり" },
      { value: "withoutUsers", label: "ユーザーなし" },
    ],
  },
  {
    field: "hasDescription",
    label: "説明",
    type: "select",
    options: [
      { value: "withDescription", label: "説明あり" },
      { value: "withoutDescription", label: "説明なし" },
    ],
  },
];

const sortOptions: SortOption[] = [
  { field: "organizationCode", label: "コード順" },
  { field: "organizationName", label: "名称順" },
  { field: "sortOrder", label: "並び順" },
  { field: "createdAt", label: "作成日順" },
];

export function WorkflowOrganizationList() {
  const [organizations, setOrganizations] = useState<
    WorkflowOrganizationForClient[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "organizationCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingOrganization, setEditingOrganization] =
    useState<WorkflowOrganizationForClient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userAssignmentOrganization, setUserAssignmentOrganization] =
    useState<WorkflowOrganizationForClient | null>(null);
  const [isUserAssignmentDialogOpen, setIsUserAssignmentDialogOpen] =
    useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getWorkflowOrganizations();
      if (result.success && result.data) {
        setOrganizations(result.data || []);
      } else if (!result.success) {
        console.error("ワークフロー組織データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("ワークフロー組織データの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (organizations.length === 0) {
      loadOrganizations();
    }
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const result = await getWorkflowOrganizations();
      if (result.success && result.data) {
        setOrganizations(result.data || []);
      } else if (!result.success) {
        console.error("ワークフロー組織データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("ワークフロー組織データの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用）
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await searchWorkflowOrganizations(searchState.searchTerm, {
        isActive: searchState.activeOnly ? true : undefined,
        hasUsers: searchState.filters.hasUsers,
        hasDescription: searchState.filters.hasDescription,
      });

      if (result.success) {
        setOrganizations(result.data || []);
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
  const filteredOrganizations = useMemo(() => {
    let processedOrganizations = organizations;

    if (useServerSearch) {
      processedOrganizations = organizations; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      // 基本的な検索・ソート処理
      processedOrganizations = searchAndSort(organizations, searchState, [
        "organizationCode",
        "organizationName",
        "description",
      ]);

      // カスタムフィルタの適用
      if (searchState.filters.hasUsers) {
        if (searchState.filters.hasUsers === "withUsers") {
          processedOrganizations = processedOrganizations.filter(
            (org) => (org.userCount || 0) > 0
          );
        } else if (searchState.filters.hasUsers === "withoutUsers") {
          processedOrganizations = processedOrganizations.filter(
            (org) => (org.userCount || 0) === 0
          );
        }
      }

      if (searchState.filters.hasDescription) {
        if (searchState.filters.hasDescription === "withDescription") {
          processedOrganizations = processedOrganizations.filter(
            (org) => org.description && org.description.trim() !== ""
          );
        } else if (
          searchState.filters.hasDescription === "withoutDescription"
        ) {
          processedOrganizations = processedOrganizations.filter(
            (org) => !org.description || org.description.trim() === ""
          );
        }
      }
    }

    return processedOrganizations;
  }, [organizations, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(organizations, filteredOrganizations);
  }, [organizations, filteredOrganizations]);

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
      loadOrganizations();
    }
  };

  const handleEdit = (organization: WorkflowOrganizationForClient) => {
    setEditingOrganization(organization);
    setIsDialogOpen(true);
  };

  const handleUserAssignment = (
    organization: WorkflowOrganizationForClient
  ) => {
    setUserAssignmentOrganization(organization);
    setIsUserAssignmentDialogOpen(true);
  };

  const handleDelete = async (organization: WorkflowOrganizationForClient) => {
    if (
      confirm(
        `ワークフロー組織「${organization.organizationName}」を削除しますか？`
      )
    ) {
      try {
        const result = await deleteWorkflowOrganization(
          organization.organizationCode
        );
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
    setEditingOrganization(null);
    // フォーム送信後は手動でリフレッシュ
    await refreshData();
  };

  const handleUserAssignmentComplete = async () => {
    setIsUserAssignmentDialogOpen(false);
    setUserAssignmentOrganization(null);
    // ユーザ割り当て後は手動でリフレッシュ
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
          placeholder="組織コード・名称・説明で検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="organizationCode"
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
                <TableHead>ユーザ数</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致するワークフロー組織が見つかりませんでした"
                      : "ワークフロー組織が登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrganizations.map((organization) => (
                  <TableRow key={organization.organizationCode}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(organization.organizationCode)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(organization.organizationName)}
                    </TableCell>
                    <TableCell>
                      {organization.description ? (
                        renderHighlightedText(organization.description)
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          未設定
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {organization.sortOrder !== null
                        ? organization.sortOrder
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {organization.userCount || 0}人
                        </Badge>
                        {(organization.userCount || 0) > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserAssignment(organization)}
                            className="h-auto p-1"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={organization.isActive ? "default" : "outline"}
                      >
                        {organization.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUserAssignment(organization)}
                          title="ユーザ割り当て"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(organization)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(organization)}
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

      {/* 組織編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>
              {editingOrganization
                ? "ワークフロー組織編集"
                : "新規ワークフロー組織作成"}
            </DialogTitle>
            <DialogDescription>
              ワークフロー組織の情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <WorkflowOrganizationForm
            organization={editingOrganization}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingOrganization(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ユーザ割り当てダイアログ */}
      <UserAssignmentDialog
        open={isUserAssignmentDialogOpen}
        onOpenChange={setIsUserAssignmentDialogOpen}
        organization={userAssignmentOrganization}
        onComplete={handleUserAssignmentComplete}
      />
    </>
  );
}

export default WorkflowOrganizationList;
