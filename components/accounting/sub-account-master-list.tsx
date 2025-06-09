"use client";

import { useState, useEffect } from "react";
import { Database } from "@/lib/database/types";
import {
  ClientSubAccountService,
  ClientAccountService,
} from "@/lib/adapters/client-data-adapter";
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
import { Edit, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubAccountMasterForm } from "./sub-account-master-form";

type SubAccount = Database["public"]["Tables"]["sub_accounts"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface SubAccountWithAccount extends SubAccount {
  account?: {
    account_code: string;
    account_name: string;
  };
}

export function SubAccountMasterList() {
  const [subAccounts, setSubAccounts] = useState<SubAccountWithAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSubAccount, setEditingSubAccount] =
    useState<SubAccountWithAccount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadSubAccounts = async () => {
    setLoading(true);
    try {
      const result = await ClientSubAccountService.getSubAccounts();
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
      const result = await ClientAccountService.getAccounts();
      if (result.success && result.data) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error("勘定科目データの取得エラー:", error);
    }
  };

  useEffect(() => {
    loadSubAccounts();
    loadAccounts();
  }, []);

  const filteredSubAccounts = subAccounts.filter((subAccount) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      subAccount.account_code.toLowerCase().includes(searchLower) ||
      subAccount.sub_account_code.toLowerCase().includes(searchLower) ||
      subAccount.sub_account_name.toLowerCase().includes(searchLower) ||
      subAccount.account?.account_name?.toLowerCase().includes(searchLower) ||
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
    loadSubAccounts();
  };

  const handleDelete = async (subAccount: SubAccountWithAccount) => {
    if (confirm(`補助科目「${subAccount.sub_account_name}」を削除しますか？`)) {
      try {
        const result = await ClientSubAccountService.deleteSubAccount(
          subAccount.account_code,
          subAccount.sub_account_code
        );
        if (result.success) {
          await loadSubAccounts();
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
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="勘定科目コード、補助科目コード、名称で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
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
              key={`${subAccount.account_code}-${subAccount.sub_account_code}`}
            >
              <TableCell>
                <div>
                  <div className="font-medium">{subAccount.account_code}</div>
                  <div className="text-sm text-muted-foreground">
                    {subAccount.account?.account_name}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono">
                {subAccount.sub_account_code}
              </TableCell>
              <TableCell>{subAccount.sub_account_name}</TableCell>
              <TableCell>
                <Badge
                  variant={subAccount.is_active ? "default" : "secondary"}
                >
                  {subAccount.is_active ? "有効" : "無効"}
                </Badge>
              </TableCell>
              <TableCell>{subAccount.sort_order || "-"}</TableCell>
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
