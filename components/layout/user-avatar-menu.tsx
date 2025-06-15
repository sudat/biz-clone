"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User as UserIcon, Users } from "lucide-react";
import { UserSwitchDialog } from "./user-switch-dialog";
import type { UserForClient } from "@/app/actions/users";

interface UserAvatarMenuProps {
  currentUser?: UserForClient | null;
  onUserChange?: (user: UserForClient) => void;
}

export function UserAvatarMenu({ 
  currentUser, 
  onUserChange 
}: UserAvatarMenuProps) {
  const router = useRouter();
  const [showUserSwitchDialog, setShowUserSwitchDialog] = useState(false);

  // デフォルトユーザー（認証機能がまだない場合の暫定対応）
  const defaultUser: UserForClient = {
    userId: "default-user",
    userCode: "ADMIN",
    userName: "管理者",
    userKana: "カンリシャ",
    email: "admin@example.com",
    roleCode: "ADMIN",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      roleName: "管理者",
    },
  };

  const user = currentUser || defaultUser;

  const getUserInitials = (userName: string) => {
    return userName
      .split("")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleUserSwitchClick = () => {
    setShowUserSwitchDialog(true);
  };

  const handleUserSelect = (selectedUser: UserForClient) => {
    if (onUserChange) {
      onUserChange(selectedUser);
    }
    setShowUserSwitchDialog(false);
    
    // ユーザ切替後にトップページへリダイレクト
    router.push("/");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src="" alt={user.userName} />
              <AvatarFallback className="text-sm font-medium">
                {getUserInitials(user.userName)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-56 shadow-xl border-0 bg-card/95 backdrop-blur-md" 
          align="end" 
          forceMount
        >
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium text-sm">{user.userName}</p>
              <p className="w-[200px] truncate text-xs text-muted-foreground">
                {user.email || `${user.userCode} - ${user.role?.roleName || ""}`}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer px-4 py-3 text-base"
            onClick={handleProfileClick}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            <span>ユーザ情報</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="cursor-pointer px-4 py-3 text-base"
            onClick={handleUserSwitchClick}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>ユーザ切替</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserSwitchDialog
        open={showUserSwitchDialog}
        onOpenChange={setShowUserSwitchDialog}
        currentUserId={user.userId}
        onUserSelect={handleUserSelect}
      />
    </>
  );
}