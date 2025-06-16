'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Mail, Calendar, Shield } from "lucide-react";
import { useUser } from "@/lib/contexts/user-context";

export default function ProfilePage() {
  const { currentUser: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">ユーザー情報が見つかりません</p>
          </div>
        </div>
      </div>
    );
  }

  const getUserInitials = (userName: string) => {
    return userName
      .split("")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getRoleName = (roleCode: string) => {
    const roleNames: Record<string, string> = {
      'ADMIN': '管理者',
      'MANAGER': 'マネージャー',
      'USER': '一般ユーザー',
      'VIEWER': '閲覧者'
    };
    return roleNames[roleCode] || roleCode;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "なし";
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto py-8 px-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <UserIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">ユーザ情報</h1>
          <p className="text-muted-foreground">
            現在ログイン中のユーザー情報を確認できます
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              基本情報
            </CardTitle>
            <CardDescription>
              ユーザーの基本的な情報です
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={user.userName} />
                <AvatarFallback className="text-lg font-medium">
                  {getUserInitials(user.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{user.userName}</h3>
                <p className="text-sm text-muted-foreground">
                  {user.userKana || ''}
                </p>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "アクティブ" : "非アクティブ"}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-muted-foreground">
                  ユーザコード
                </div>
                <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                  {user.userCode}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="w-16 text-sm font-medium text-muted-foreground">
                  メール
                </div>
                <div className="text-sm">{user.email}</div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div className="w-16 text-sm font-medium text-muted-foreground">
                  ロール
                </div>
                <div className="text-sm">
                  {getRoleName(user.roleCode)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({user.roleCode})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              アクティビティ
            </CardTitle>
            <CardDescription>
              ログイン履歴とアカウント情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  最終ログイン
                </div>
                <div className="text-sm">
                  {formatDate(user.lastLoginAt)}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  アカウント作成日
                </div>
                <div className="text-sm">
                  {formatDate(user.createdAt)}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  最終更新日
                </div>
                <div className="text-sm">
                  {formatDate(user.updatedAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          ユーザー情報の編集機能は今後のバージョンで追加予定です。
        </p>
      </div>
    </div>
  );
}