"use client";

import { useState, useEffect, useMemo } from "react";
import { getUsers, type UserForClient } from "@/app/actions/users";
import {
  assignUsersToOrganization,
  removeUsersFromOrganization,
  type WorkflowOrganizationForClient,
} from "@/app/actions/workflow-organizations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Tabs component is not available, using custom toggle
import { showErrorToast, showSuccessToast } from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";
import { Search, Users, UserPlus, UserMinus } from "lucide-react";

interface UserAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: WorkflowOrganizationForClient | null;
  onComplete: () => void;
}

export function UserAssignmentDialog({
  open,
  onOpenChange,
  organization,
  onComplete,
}: UserAssignmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserForClient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("assign");

  useEffect(() => {
    if (open && organization) {
      loadUsers();
    }
  }, [open, organization]);

  useEffect(() => {
    // 組織が変わったら選択をリセット
    setSelectedUserIds(new Set());
    setSearchTerm("");
  }, [organization]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers();
      if (result.success && result.data) {
        setAllUsers(result.data);
      } else {
        console.error("ユーザデータの取得エラー:", result.error);
      }
    } catch (error) {
      console.error("ユーザデータの取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // 組織に現在割り当てられているユーザ
  const assignedUsers = useMemo(() => {
    if (!organization?.users) return [];
    return organization.users.map(u => u.userId);
  }, [organization]);

  // 検索・フィルタリング後のユーザ一覧
  const filteredUsers = useMemo(() => {
    let users = allUsers.filter(user => user.isActive); // アクティブユーザのみ

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      users = users.filter(user =>
        user.userCode.toLowerCase().includes(searchLower) ||
        user.userName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.userKana && user.userKana.toLowerCase().includes(searchLower))
      );
    }

    return users;
  }, [allUsers, searchTerm]);

  // 割り当て可能なユーザ（未割り当てのユーザ）
  const availableUsers = useMemo(() => {
    return filteredUsers.filter(user => !assignedUsers.includes(user.userId));
  }, [filteredUsers, assignedUsers]);

  // 割り当て済みユーザ（現在の組織に所属しているユーザ）
  const currentAssignedUsers = useMemo(() => {
    return filteredUsers.filter(user => assignedUsers.includes(user.userId));
  }, [filteredUsers, assignedUsers]);

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectAll = (users: UserForClient[]) => {
    const userIds = users.map(u => u.userId);
    const newSelected = new Set(selectedUserIds);
    
    const allSelected = userIds.every(id => newSelected.has(id));
    
    if (allSelected) {
      // 全て選択済みなら全て解除
      userIds.forEach(id => newSelected.delete(id));
    } else {
      // 一部または全て未選択なら全て選択
      userIds.forEach(id => newSelected.add(id));
    }
    
    setSelectedUserIds(newSelected);
  };

  const handleAssignUsers = async () => {
    if (!organization || selectedUserIds.size === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("organizationCode", organization.organizationCode);
      formData.append("userIds", Array.from(selectedUserIds).join(","));

      const result = await assignUsersToOrganization(formData);
      if (result.success) {
        showSuccessToast(`${selectedUserIds.size}人のユーザを組織に割り当てました`);
        setSelectedUserIds(new Set());
        onComplete();
      } else {
        showErrorToast(
          result.error || createSystemError("ユーザ割り当てに失敗しました", "割り当て処理")
        );
      }
    } catch (error) {
      console.error("ユーザ割り当てエラー:", error);
      showErrorToast(createSystemError("ユーザ割り当てに失敗しました", "システムエラー"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUsers = async () => {
    if (!organization || selectedUserIds.size === 0) return;

    if (!confirm(`選択した${selectedUserIds.size}人のユーザを組織から解除しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("organizationCode", organization.organizationCode);
      formData.append("userIds", Array.from(selectedUserIds).join(","));

      const result = await removeUsersFromOrganization(formData);
      if (result.success) {
        showSuccessToast(`${selectedUserIds.size}人のユーザを組織から解除しました`);
        setSelectedUserIds(new Set());
        onComplete();
      } else {
        showErrorToast(
          result.error || createSystemError("ユーザ解除に失敗しました", "解除処理")
        );
      }
    } catch (error) {
      console.error("ユーザ解除エラー:", error);
      showErrorToast(createSystemError("ユーザ解除に失敗しました", "システムエラー"));
    } finally {
      setLoading(false);
    }
  };

  const renderUserTable = (users: UserForClient[], showSelectAll: boolean = true) => (
    <div className="space-y-4">
      {showSelectAll && users.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectAll(users)}
            disabled={loading}
          >
            {users.every(u => selectedUserIds.has(u.userId)) ? "全て解除" : "全て選択"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedUserIds.size > 0 && `${selectedUserIds.size}人選択中`}
          </span>
        </div>
      )}
      
      <div className="rounded-md border max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">選択</TableHead>
              <TableHead>コード</TableHead>
              <TableHead>名前</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>ロール</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {searchTerm ? "検索条件に一致するユーザが見つかりませんでした" : "ユーザがいません"}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUserIds.has(user.userId)}
                      onCheckedChange={() => handleUserToggle(user.userId)}
                      disabled={loading}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{user.userCode}</TableCell>
                  <TableCell className="font-medium">
                    {user.userName}
                    {user.userKana && (
                      <div className="text-sm text-muted-foreground">
                        {user.userKana}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role?.roleName && (
                      <Badge variant="outline">{user.role.roleName}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ユーザ割り当て管理 - {organization.organizationName}
          </DialogTitle>
          <DialogDescription>
            組織に所属するユーザの割り当て・解除を行います。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Custom Tab Header */}
            <div className="grid w-full grid-cols-2 border rounded-lg p-1 bg-muted">
              <Button
                variant={activeTab === "assign" ? "default" : "ghost"}
                onClick={() => setActiveTab("assign")}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                ユーザ追加 ({availableUsers.length}人)
              </Button>
              <Button
                variant={activeTab === "remove" ? "default" : "ghost"}
                onClick={() => setActiveTab("remove")}
                className="flex items-center gap-2"
              >
                <UserMinus className="h-4 w-4" />
                ユーザ解除 ({currentAssignedUsers.length}人)
              </Button>
            </div>

            <div className="flex-1 overflow-hidden mt-4">
              {activeTab === "assign" && (
                <div className="h-full flex flex-col space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ユーザコード・名前・メールで検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {renderUserTable(availableUsers)}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleAssignUsers}
                      disabled={loading || selectedUserIds.size === 0}
                    >
                      {loading ? "割り当て中..." : `${selectedUserIds.size}人を割り当て`}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "remove" && (
                <div className="h-full flex flex-col space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ユーザコード・名前・メールで検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {renderUserTable(currentAssignedUsers)}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                    >
                      キャンセル
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRemoveUsers}
                      disabled={loading || selectedUserIds.size === 0}
                    >
                      {loading ? "解除中..." : `${selectedUserIds.size}人を解除`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}