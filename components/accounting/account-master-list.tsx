"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getAccounts,
  searchAccounts,
  deleteAccount,
  type AccountForClient,
} from "@/app/actions/accounts";
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
import { AccountMasterForm } from "@/components/accounting/account-master-form";
import { Badge } from "@/components/ui/badge";
import { ACCOUNT_TYPE_OPTIONS } from "@/types/master-types";

const searchFilters: SearchFilter[] = [
  {
    field: "accountType",
    label: "勘定科目種別",
    type: "select",
    options: ACCOUNT_TYPE_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  },
];

const sortOptions: SortOption[] = [
  { field: "accountCode", label: "コード順" },
  { field: "accountName", label: "名称順" },
  { field: "accountType", label: "種別順" },
  { field: "createdAt", label: "作成日順" },
];

export function AccountMasterList() {
  const [accounts, setAccounts] = useState<AccountForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "accountCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingAccount, setEditingAccount] = useState<AccountForClient | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 階層深度計算関数
  const calculateDepth = useCallback(
    (accountCode: string, accounts: AccountForClient[]): number => {
      const account = accounts.find((acc) => acc.accountCode === accountCode);
      if (!account?.parentAccountCode) return 0;
      return 1 + calculateDepth(account.parentAccountCode, accounts);
    },
    []
  );

  // 階層ソート関数
  const buildHierarchicalList = useCallback(
    (accounts: AccountForClient[]): AccountForClient[] => {
      const result: AccountForClient[] = [];
      const processed = new Set<string>();

      // 親科目から子科目の順で追加する再帰関数
      const addAccountWithChildren = (
        parentCode: string | null,
        depth: number = 0
      ) => {
        // 指定された親を持つ科目を取得（親科目がnullの場合はルート科目）
        const children = accounts
          .filter((acc) => acc.parentAccountCode === parentCode)
          .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

        children.forEach((account) => {
          if (!processed.has(account.accountCode)) {
            processed.add(account.accountCode);
            // 深度情報を追加
            result.push({
              ...account,
              _hierarchyDepth: depth,
            } as AccountForClient & { _hierarchyDepth: number });
            // 子科目を再帰的に追加
            addAccountWithChildren(account.accountCode, depth + 1);
          }
        });
      };

      // ルート科目（親科目なし）から開始
      addAccountWithChildren(null);

      return result;
    },
    []
  );

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getAccounts();
      if (result.success && result.data) {
        setAccounts(result.data || []);
      } else if (!result.success) {
        console.error("勘定科目データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("勘定科目データの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      loadAccounts();
    }
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const result = await getAccounts();
      if (result.success && result.data) {
        setAccounts(result.data || []);
      } else if (!result.success) {
        console.error("勘定科目データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("勘定科目データの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用、階層表示対応）
  const performServerSearch = useCallback(
    async (searchState: SearchState) => {
      setLoading(true);
      try {
        const result = await searchAccounts(searchState.searchTerm, {
          accountType: searchState.filters.accountType,
          isActive: searchState.activeOnly ? true : undefined,
        });

        if (result.success) {
          // サーバーサイド検索結果も階層表示用にソート
          const hierarchicalData = buildHierarchicalList(result.data || []);
          setAccounts(hierarchicalData);
        } else {
          console.error("検索エラー:", result.error);
        }
      } catch (error) {
        console.error("検索エラー:", error);
      } finally {
        setLoading(false);
      }
    },
    [buildHierarchicalList]
  );

  // クライアントサイド検索・フィルタリング（階層表示対応）
  const filteredAccounts = useMemo(() => {
    let processedAccounts = accounts;

    if (useServerSearch) {
      processedAccounts = accounts; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      processedAccounts = searchAndSort(accounts, searchState, [
        "accountCode",
        "accountName",
        "accountType",
      ]);
    }

    // 階層表示用にソート（検索結果も階層構造を保持）
    return buildHierarchicalList(processedAccounts);
  }, [accounts, searchState, useServerSearch, buildHierarchicalList]);

  const searchStats = useMemo(() => {
    return getSearchStats(accounts, filteredAccounts);
  }, [accounts, filteredAccounts]);

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
      loadAccounts();
    }
  };

  const handleEdit = (account: AccountForClient) => {
    setEditingAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = async (account: AccountForClient) => {
    if (confirm(`勘定科目「${account.accountName}」を削除しますか？`)) {
      try {
        const result = await deleteAccount(account.accountCode);
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
    setEditingAccount(null);
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
          placeholder="勘定科目コード・名称・種別で検索..."
          searchFilters={searchFilters}
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
                <TableHead>コード</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>区分</TableHead>
                <TableHead>税区分</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致する勘定科目が見つかりませんでした"
                      : "勘定科目が登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => {
                  const depth =
                    (account as AccountForClient & { _hierarchyDepth?: number })
                      ._hierarchyDepth || 0;
                  return (
                    <TableRow key={account.accountCode}>
                      <TableCell className="font-mono">
                        {renderHighlightedText(account.accountCode)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <span style={{ marginLeft: `${depth * 10}px` }}>
                            {depth > 0 && (
                              <span className="text-muted-foreground">
                                └{" "}
                              </span>
                            )}
                            {renderHighlightedText(account.accountName)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderHighlightedText(account.accountType)}
                      </TableCell>
                      <TableCell>
                        {account.isDetail ? (
                          <Badge variant="default">明細科目</Badge>
                        ) : (
                          <Badge variant="outline">集計科目</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {account.defaultTaxRate ? (
                          <Badge variant="secondary">
                            {account.defaultTaxRate.taxName} ({account.defaultTaxRate.taxRate}%)
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">未設定</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={account.isActive ? "default" : "outline"}
                        >
                          {account.isActive ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(account)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "勘定科目編集" : "新規勘定科目作成"}
            </DialogTitle>
            <DialogDescription>
              勘定科目の情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <AccountMasterForm
            account={editingAccount}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingAccount(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AccountMasterList;
