"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { LogOut, User as UserIcon, Menu, X } from "lucide-react";
import type { Database } from "@/lib/database/types";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Supabase browser client を作成
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 初期ユーザー状態を取得
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    getUser();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login?message=signed-out");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ユーザー名を取得（メタデータまたはメールから）
  const getUserDisplayName = (user: User) => {
    return (
      user.user_metadata?.full_name || user.email?.split("@")[0] || "ユーザー"
    );
  };

  // ユーザーのイニシャルを取得
  const getUserInitials = (user: User) => {
    const fullName = user.user_metadata?.full_name;
    if (typeof fullName === "string" && fullName.length > 0) {
      return fullName
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (user.email?.[0] || "U").toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto px-4 flex h-14 items-center justify-between max-w-7xl">
        {/* ロゴ */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-lg">Biz Clone</span>
        </Link>

        {/* デスクトップメニューバー */}
        <Menubar className="hidden md:flex border-0 bg-transparent">
          <MenubarMenu>
            <MenubarTrigger>仕訳</MenubarTrigger>
            <MenubarContent>
              <MenubarItem asChild>
                <Link href="/siwake/new">仕訳作成</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/siwake">仕訳照会</Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>マスタ</MenubarTrigger>
            <MenubarContent>
              <MenubarItem asChild>
                <Link href="/master/accounts">勘定科目</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/master/sub-accounts">補助科目</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/master/partners">取引先</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/master/analysis-codes">分析コード</Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>レポート</MenubarTrigger>
            <MenubarContent>
              <MenubarItem asChild>
                <Link href="/reports/trial-balance">試算表</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/reports/journal">仕訳帳</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/reports/ledger">総勘定元帳</Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {/* 右側のアクション */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />

          {/* モバイルメニューボタン */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>

          {/* 認証関連UI */}
          {!isLoading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.user_metadata?.avatar_url}
                          alt="Avatar"
                        />
                        <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {getUserDisplayName(user)}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>ログアウト</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="hidden md:flex">
                  <Link href="/login">
                    <UserIcon className="mr-2 h-4 w-4" />
                    ログイン
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground px-2">
                仕訳
              </p>
              <Link
                href="/siwake/new"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                仕訳作成
              </Link>
              <Link
                href="/siwake"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                仕訳照会
              </Link>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground px-2">
                マスタ
              </p>
              <Link
                href="/master/accounts"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                勘定科目
              </Link>
              <Link
                href="/master/sub-accounts"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                補助科目
              </Link>
              <Link
                href="/master/partners"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                取引先
              </Link>
              <Link
                href="/master/analysis-codes"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                分析コード
              </Link>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground px-2">
                レポート
              </p>
              <Link
                href="/reports/trial-balance"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                試算表
              </Link>
              <Link
                href="/reports/journal"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                仕訳帳
              </Link>
              <Link
                href="/reports/ledger"
                className="block px-2 py-1 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                総勘定元帳
              </Link>
            </div>

            {/* モバイル用ログインボタン */}
            {!isLoading && !user && (
              <div className="pt-2 border-t">
                <Button asChild size="sm" className="w-full">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    ログイン
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
