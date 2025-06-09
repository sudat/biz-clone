"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Database } from "@/lib/database/types";
import { ClientAccountService } from "@/lib/adapters/client-data-adapter";
import { AccountDataAdapter } from "@/lib/adapters/client-data-adapter";
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

type Account = Database["public"]["Tables"]["accounts"]["Row"];

const searchFilters: SearchFilter[] = [
  {
    field: "account_type",
    label: "勘定科目種別",
    type: "select",
    options: [
      { value: "資産", label: "資産" },
      { value: "負債", label: "負債" },
      { value: "純資産", label: "純資産" },
      { value: "収益", label: "収益" },
      { value: "費用", label: "費用" },
    ],
  },
];

const sortOptions: SortOption[] = [
  { field: "account_code", label: "コード順" },
  { field: "account_name", label: "名称順" },
  { field: "account_type", label: "種別順" },
  { field: "created_at", label: "作成日順" },
];

export function EnhancedAccountMasterList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "account_code",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const result = await ClientAccountService.getAccounts();
      if (result.success && result.data) {
        setAccounts(result.data);
      } else if (!result.success) {
        console.error("勘定科目データの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("勘定科目データの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（Supabase Full Text Search使用）
  const performServerSearch = useCallback(async (searchState: SearchState) => {
    setLoading(true);
    try {
      const result = await AccountDataAdapter.searchAccounts(
        searchState.searchTerm,
        {
          account_type: searchState.filters.account_type,
          is_active: searchState.activeOnly ? true : undefined,
        }
      );

      if (result.success) {
        setAccounts(result.data);
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
  const filteredAccounts = useMemo(() => {
    if (useServerSearch) {
      return accounts; // サーバーサイド検索済みのデータをそのまま使用
    }

    return searchAndSort(accounts, searchState, [
      "account_code",
      "account_name",
      "account_type",
    ]);
  }, [accounts, searchState, useServerSearch]);

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

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = async (account: Account) => {
    if (confirm(`勘定科目「${account.account_name}」を削除しますか？`)) {
      try {
        const result = await ClientAccountService.deleteAccount(
          account.account_code
        );
        if (result.success) {
          await loadAccounts();
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
    await loadAccounts();
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
          placeholder="勘定科目コード・名称・種別で検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="account_code"
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
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
                filteredAccounts.map((account) => (
                  <TableRow key={account.account_code}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(account.account_code)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {renderHighlightedText(account.account_name)}
                    </TableCell>
                    <TableCell>
                      {renderHighlightedText(account.account_type)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={account.is_active ? "default" : "secondary"}
                      >
                        {account.is_active ? "有効" : "無効"}
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
