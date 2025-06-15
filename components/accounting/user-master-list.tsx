"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getUsers,
  searchUsers,
  deleteUser,
  type UserForClient,
} from "@/app/actions/users";
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
import { Pencil, Trash2, RefreshCw, Key } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserMasterForm } from "@/components/accounting/user-master-form";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const searchFilters: SearchFilter[] = [];

const sortOptions: SortOption[] = [
  { field: "userCode", label: "コード順" },
  { field: "userName", label: "名称順" },
  { field: "email", label: "メール順" },
  { field: "lastLoginAt", label: "最終ログイン順" },
  { field: "createdAt", label: "作成日順" },
];

export function UserMasterList() {
  const [users, setUsers] = useState<UserForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: "",
    filters: {},
    sortField: "userCode",
    sortDirection: "asc",
    activeOnly: false,
  });
  const [editingUser, setEditingUser] = useState<UserForClient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function using new Server Actions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getUsers();
      if (result.success && result.data) {
        setUsers(result.data || []);
      } else if (!result.success) {
        console.error("ユーザデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("ユーザデータの取得エラー:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers();
      if (result.success && result.data) {
        setUsers(result.data || []);
      } else if (!result.success) {
        console.error("ユーザデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("ユーザデータの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // サーバーサイド検索（新しいServer Actions使用）
  const performServerSearch = useCallback(
    async (searchState: SearchState) => {
      setLoading(true);
      try {
        const result = await searchUsers(searchState.searchTerm, {
          isActive: searchState.activeOnly ? true : undefined,
        });

        if (result.success) {
          setUsers(result.data || []);
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
  const filteredUsers = useMemo(() => {
    let processedUsers = users;

    if (useServerSearch) {
      processedUsers = users; // サーバーサイド検索済みのデータをそのまま使用
    } else {
      processedUsers = searchAndSort(users, searchState, [
        "userCode",
        "userName",
        "userKana",
        "email",
        "role.roleName",
      ]);
    }

    return processedUsers;
  }, [users, searchState, useServerSearch]);

  const searchStats = useMemo(() => {
    return getSearchStats(users, filteredUsers);
  }, [users, filteredUsers]);

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
      loadUsers();
    }
  };

  const handleEdit = (user: UserForClient) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = async (user: UserForClient) => {
    if (confirm(`ユーザ「${user.userName}」を削除しますか？`)) {
      try {
        const result = await deleteUser(user.userId);
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
    setEditingUser(null);
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

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return format(date, "yyyy/MM/dd HH:mm", { locale: ja });
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
          placeholder="ユーザーコード・名前・メールアドレスで検索..."
          searchFilters={searchFilters}
          sortOptions={sortOptions}
          defaultSortField="userCode"
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
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>最終ログイン</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchState.searchTerm ||
                    Object.keys(searchState.filters).length > 0 ||
                    searchState.activeOnly
                      ? "検索条件に一致するユーザが見つかりませんでした"
                      : "ユーザが登録されていません"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-mono">
                      {renderHighlightedText(user.userCode)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{renderHighlightedText(user.userName)}</div>
                        {user.userKana && (
                          <div className="text-xs text-muted-foreground">
                            {renderHighlightedText(user.userKana)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderHighlightedText(user.email)}
                    </TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge variant="secondary">
                          {renderHighlightedText(user.role.roleName)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">未設定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDate(user.lastLoginAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "default" : "outline"}
                      >
                        {user.isActive ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(user)}
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
              {editingUser ? "ユーザ編集" : "新規ユーザ作成"}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "ユーザの情報を編集してください。パスワード変更は別途設定画面で行えます。"
                : "ユーザの情報を入力してください。"
              }
            </DialogDescription>
          </DialogHeader>
          <UserMasterForm
            user={editingUser}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingUser(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UserMasterList;