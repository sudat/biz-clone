"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { SubAccount } from "@/lib/database/prisma";
import {
  getSubAccounts,
  deleteSubAccount,
  searchSubAccounts,
} from "@/app/actions/sub-accounts";
import { getAccounts, type AccountForClient } from "@/app/actions/accounts";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubAccountMasterForm } from "./sub-account-master-form";

const searchFilters: SearchFilter[] = [
  {
    field: "accountCode",
    label: "勘定科目",
    type: "select",
    options: [], // 動的に設定
  },
];

const sortOptions: SortOption[] = [
  { field: "accountCode", label: "勘定科目コード順" },
  { field: "subAccountCode", label: "補助科目コード順" },
  { field: "subAccountName", label: "補助科目名順" },
  { field: "createdAt", label: "作成日順" },
];

interface SubAccountWithAccount extends SubAccount {
  account?: {
    accountCode: string;
    accountName: string;
  };
}

export function SubAccountMasterList() {
  const [subAccounts, setSubAccounts] = useState<SubAccountWithAccount[]>([]);
  const [accounts, setAccounts] = useState<AccountForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "accountCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingSubAccount, setEditingSubAccount] =
    useState<SubAccountWithAccount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 勘定科目フィルタオプションを動的に生成
  const accountFilterOptions = useMemo(() => {
    const uniqueAccounts = Array.from(
      new Map(
        subAccounts
          .filter((sub) => sub.account)
          .map((sub) => [
            sub.accountCode,
            {
              value: sub.accountCode,
              label: `${sub.accountCode} - ${sub.account?.accountName}`,
            },
          ])
      ).values()
    );
    return uniqueAccounts.sort((a, b) => a.value.localeCompare(b.value));
  }, [subAccounts]);

  // フィルタオプションを更新
  const updatedSearchFilters = useMemo(() => {
    return searchFilters.map((filter) => {
      if (filter.field === "accountCode") {
        return { ...filter, options: accountFilterOptions };
      }
      return filter;
    });
  }, [accountFilterOptions]);

  // サーバーサイド検索
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await searchSubAccounts(searchState.searchTerm, {
        is_active: searchState.activeOnly ? true : undefined,
        account_code: searchState.filters.accountCode,
      });

      if (result.success) {
        setSubAccounts((result.data as SubAccountWithAccount[]) || []);
      } else {
        console.error("検索エラー:", result.error);
      }
    } catch (error) {
      console.error("検索エラー:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // フィルタリングされた補助科目リスト
  const filteredSubAccounts = useMemo(() => {
    let processedSubAccounts = subAccounts;

    if (useServerSearch) {
      processedSubAccounts = subAccounts; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      processedSubAccounts = searchAndSort(
        subAccounts as unknown as Record<string, unknown>[],
        searchState,
        [
          "accountCode",
          "subAccountCode",
          "subAccountName",
          "account.accountName",
        ]
      ) as unknown as SubAccountWithAccount[];
    }

    return processedSubAccounts;
  }, [subAccounts, searchState, useServerSearch]);

  // 検索統計
  const searchStats = useMemo(() => {
    return getSearchStats(subAccounts, filteredSubAccounts);
  }, [subAccounts, filteredSubAccounts]);

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
      loadSubAccounts();
    }
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

  const loadSubAccounts = async () => {
    setLoading(true);
    try {
      const result = await getSubAccounts();
      if (result.success && result.data) {
        setSubAccounts(result.data as SubAccountWithAccount[]);
      } else if (!result.success) {
        console.error("補助科目データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("補助科目データの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const result = await getAccounts();
      if (result.success && result.data) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error("勘定科目データの取得エラー:", error);
    }
  };

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [subAccountsResult, accountsResult] = await Promise.all([
        getSubAccounts(),
        getAccounts(),
      ]);

      if (subAccountsResult.success && subAccountsResult.data) {
        setSubAccounts(subAccountsResult.data as SubAccountWithAccount[]);
      } else if (!subAccountsResult.success) {
        console.error("補助科目データの取得エラー:", subAccountsResult.error);
      }

      if (accountsResult.success && accountsResult.data) {
        setAccounts(accountsResult.data);
      }
    } catch (error) {
      console.error("データの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSubAccounts();
    loadAccounts();
  }, []);

  const handleEdit = (subAccount: SubAccountWithAccount) => {
    setEditingSubAccount(subAccount);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    setIsEditDialogOpen(false);
    setEditingSubAccount(null);
    refreshData();
  };

  const handleDelete = async (subAccount: SubAccountWithAccount) => {
    if (confirm(`補助科目「${subAccount.subAccountName}」を削除しますか？`)) {
      try {
        const result = await deleteSubAccount(
          subAccount.accountCode,
          subAccount.subAccountCode
        );
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

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 検索・フィルタコンポーネント */}
      <MasterDataSearch
        placeholder="勘定科目コード、補助科目コード、名称で検索..."
        searchFilters={updatedSearchFilters}
        sortOptions={sortOptions}
        defaultSortField="accountCode"
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
              <TableHead>勘定科目</TableHead>
              <TableHead>補助科目コード</TableHead>
              <TableHead>補助科目名称</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>並び順</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubAccounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  {searchState.searchTerm ||
                  Object.keys(searchState.filters).length > 0
                    ? "検索条件に一致する補助科目が見つかりません"
                    : "補助科目が登録されていません"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSubAccounts.map((subAccount) => (
                <TableRow
                  key={`${subAccount.accountCode}-${subAccount.subAccountCode}`}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {renderHighlightedText(subAccount.accountCode)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {subAccount.account?.accountName &&
                          renderHighlightedText(subAccount.account.accountName)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {renderHighlightedText(subAccount.subAccountCode)}
                  </TableCell>
                  <TableCell>
                    {renderHighlightedText(subAccount.subAccountName)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={subAccount.isActive ? "default" : "outline"}
                    >
                      {subAccount.isActive ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                  <TableCell>{subAccount.sortOrder || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => handleEdit(subAccount)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => handleDelete(subAccount)}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>補助科目編集</DialogTitle>
            <DialogDescription>
              補助科目の情報を編集してください。
            </DialogDescription>
          </DialogHeader>
          {editingSubAccount && (
            <SubAccountMasterForm
              subAccount={editingSubAccount}
              accounts={accounts}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
