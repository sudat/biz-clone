"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, User as UserIcon } from "lucide-react";
import { getActiveUsers } from "@/app/actions/users";
import type { UserForClient } from "@/app/actions/users";
import { cn } from "@/lib/utils";

interface UserSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onUserSelect: (user: UserForClient) => void;
}

export function UserSwitchDialog({
  open,
  onOpenChange,
  currentUserId,
  onUserSelect,
}: UserSwitchDialogProps) {
  const [users, setUsers] = useState<UserForClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActiveUsers();
      if (result.success && result.data) {
        // getActiveUsersは既にUserForClient[]を返すため、直接使用
        setUsers(result.data);
      } else {
        setError(result.error || "ユーザの取得に失敗しました");
      }
    } catch (err) {
      console.error("ユーザ取得エラー:", err);
      setError("ユーザの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: UserForClient) => {
    onUserSelect(user);
    onOpenChange(false);
  };

  const getUserInitials = (userName: string) => {
    return userName
      .split("")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            ユーザ切替
          </DialogTitle>
          <DialogDescription>
            使用するユーザを選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">読み込み中...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          {!loading && !error && users.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                利用可能なユーザがありません
              </div>
            </div>
          )}

          {!loading && !error && users.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {users.map((user) => (
                <Button
                  key={user.userId}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto p-3 hover:bg-accent/50",
                    currentUserId === user.userId && "bg-accent/50"
                  )}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user.userName} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(user.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{user.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.userCode}
                      </div>
                    </div>
                    {currentUserId === user.userId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}