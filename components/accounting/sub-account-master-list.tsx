"use client";

import { useState, useEffect } from "react";
import type { SubAccount } from "@/lib/database/prisma";
import { getSubAccounts, deleteSubAccount } from "@/app/actions/sub-accounts";
import { getAccounts, type AccountForClient } from "@/app/actions/accounts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Search, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubAccountMasterForm } from "./sub-account-master-form";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSubAccount, setEditingSubAccount] =
    useState<SubAccountWithAccount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const [subAccountsResult, accountsResult] = await Promise.all([
        getSubAccounts(),
        getAccounts()
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
  };

  useEffect(() => {
    loadSubAccounts();
    loadAccounts();
  }, []);

  const filteredSubAccounts = subAccounts.filter((subAccount) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      subAccount.accountCode.toLowerCase().includes(searchLower) ||
      subAccount.subAccountCode.toLowerCase().includes(searchLower) ||
      subAccount.subAccountName.toLowerCase().includes(searchLower) ||
      subAccount.account?.accountName?.toLowerCase().includes(searchLower) ||
      ""
    );
  });

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

  if (loading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="勘定科目コード、補助科目コード、名称で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshData}
          disabled={refreshing}
          className="h-auto p-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>勘定科目</TableHead>
            <TableHead>補助科目コード</TableHead>
            <TableHead>補助科目名称</TableHead>
            <TableHead>有効</TableHead>
            <TableHead>並び順</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSubAccounts.map((subAccount) => (
            <TableRow
              key={`${subAccount.accountCode}-${subAccount.subAccountCode}`}
            >
              <TableCell>
                <div>
                  <div className="font-medium">{subAccount.accountCode}</div>
                  <div className="text-sm text-muted-foreground">
                    {subAccount.account?.accountName}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono">
                {subAccount.subAccountCode}
              </TableCell>
              <TableCell>{subAccount.subAccountName}</TableCell>
              <TableCell>
                <Badge
                  variant={subAccount.isActive ? "default" : "secondary"}
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
                    onClick={() => handleEdit(subAccount)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(subAccount)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filteredSubAccounts.length === 0 && !loading && (
        <div className="text-center py-4 text-muted-foreground">
          {searchTerm
            ? "検索条件に一致する補助科目が見つかりません"
            : "補助科目が登録されていません"}
        </div>
      )}

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
