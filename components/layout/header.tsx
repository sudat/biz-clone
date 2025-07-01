"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/contexts/user-context";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarPortal,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Menu,
  X,
  Calculator,
  Edit3,
  Database,
  BarChart3,
  GitBranch,
} from "lucide-react";
import { UserAvatarMenu } from "./user-avatar-menu";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, isLoading, setCurrentUser } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="mx-auto px-6 lg:px-8 flex h-16 items-center justify-between max-w-7xl">
        {/* ロゴ */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <span className="font-bold text-primary text-sm">BC</span>
          </div>
          <span className="font-bold text-xl">Biz Clone</span>
        </Link>

        {/* デスクトップメニューバー */}
        <Menubar className="hidden md:flex border-0 bg-transparent shadow-none">
          <MenubarMenu>
            <MenubarTrigger className="px-4 py-2 text-base font-medium hover:bg-accent/50 data-[state=open]:bg-accent/50 transition-colors flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              一般会計
            </MenubarTrigger>
            <MenubarContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
              <MenubarSub>
                <MenubarSubTrigger className="px-4 py-3 text-base flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  仕訳
                </MenubarSubTrigger>
                <MenubarPortal>
                  <MenubarSubContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
                    <MenubarItem asChild>
                      <Link href="/siwake/new" className="px-4 py-3 text-base">
                        仕訳作成
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link href="/siwake" className="px-4 py-3 text-base">
                        仕訳一覧
                      </Link>
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarPortal>
              </MenubarSub>

              <MenubarSub>
                <MenubarSubTrigger className="px-4 py-3 text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  マスタ
                </MenubarSubTrigger>
                <MenubarPortal>
                  <MenubarSubContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
                    <MenubarItem asChild>
                      <Link
                        href="/master/accounts"
                        className="px-4 py-3 text-base"
                      >
                        勘定科目
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/sub-accounts"
                        className="px-4 py-3 text-base"
                      >
                        補助科目
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/partners"
                        className="px-4 py-3 text-base"
                      >
                        取引先
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/analysis-codes"
                        className="px-4 py-3 text-base"
                      >
                        分析コード
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/departments"
                        className="px-4 py-3 text-base"
                      >
                        計上部門
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/tax-rates"
                        className="px-4 py-3 text-base"
                      >
                        税区分
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/roles"
                        className="px-4 py-3 text-base"
                      >
                        ロール
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/users"
                        className="px-4 py-3 text-base"
                      >
                        ユーザ
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/workflow-organizations"
                        className="px-4 py-3 text-base"
                      >
                        ワークフロー組織
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/workflow-routes"
                        className="px-4 py-3 text-base"
                      >
                        ワークフロールート
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/master/reconciliation-mappings"
                        className="px-4 py-3 text-base"
                      >
                        勘定照合
                      </Link>
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarPortal>
              </MenubarSub>

              <MenubarSub>
                <MenubarSubTrigger className="px-4 py-3 text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  レポート
                </MenubarSubTrigger>
                <MenubarPortal>
                  <MenubarSubContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
                    <MenubarItem asChild>
                      <Link
                        href="/reports/trial-balance"
                        className="px-4 py-3 text-base"
                      >
                        試算表
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/reports/journal"
                        className="px-4 py-3 text-base"
                      >
                        仕訳帳
                      </Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                      <Link
                        href="/reports/ledger"
                        className="px-4 py-3 text-base"
                      >
                        総勘定元帳
                      </Link>
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarPortal>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>

          {/* ワークフローメニュー */}
          <MenubarMenu>
            <MenubarTrigger className="px-4 py-2 text-base font-medium hover:bg-accent/50 data-[state=open]:bg-accent/50 transition-colors flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              ワークフロー
            </MenubarTrigger>
            <MenubarContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
              <MenubarItem asChild>
                <Link
                  href="/workflow/approval-list"
                  className="px-4 py-3 text-base"
                >
                  承認対象一覧
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {/* 右側のアクション */}
        <div className="flex items-center space-x-3">
          {!isLoading && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {currentUser?.userName || "ユーザー未選択"}
              </span>
              <UserAvatarMenu
                currentUser={currentUser}
                onUserChange={setCurrentUser}
              />
            </div>
          )}
          <ThemeToggle />

          {/* モバイルメニューボタン */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 p-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-card/95 backdrop-blur-md shadow-lg">
          <div className="container mx-auto px-6 py-6 space-y-6">
            <div className="space-y-3">
              <p className="text-lg font-bold text-foreground px-3 flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                一般会計
              </p>

              <div className="space-y-4 ml-4">
                <div className="space-y-3">
                  <p className="text-base font-semibold text-foreground px-3 flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    仕訳
                  </p>
                  <Link
                    href="/siwake/new"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    仕訳作成
                  </Link>
                  <Link
                    href="/siwake"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    仕訳一覧
                  </Link>
                </div>

                <div className="space-y-3">
                  <p className="text-base font-semibold text-foreground px-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    マスタ
                  </p>
                  <Link
                    href="/master/accounts"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    勘定科目
                  </Link>
                  <Link
                    href="/master/sub-accounts"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    補助科目
                  </Link>
                  <Link
                    href="/master/partners"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    取引先
                  </Link>
                  <Link
                    href="/master/analysis-codes"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    分析コード
                  </Link>
                  <Link
                    href="/master/departments"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    計上部門
                  </Link>
                  <Link
                    href="/master/tax-rates"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    税区分
                  </Link>
                  <Link
                    href="/master/roles"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ロール
                  </Link>
                  <Link
                    href="/master/users"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ユーザ
                  </Link>
                  <Link
                    href="/master/workflow-organizations"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ワークフロー組織
                  </Link>
                  <Link
                    href="/master/workflow-routes"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ワークフロールート
                  </Link>
                  <Link
                    href="/master/reconciliation-mappings"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    勘定照合
                  </Link>
                </div>

                <div className="space-y-3">
                  <p className="text-base font-semibold text-foreground px-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    レポート
                  </p>
                  <Link
                    href="/reports/trial-balance"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    試算表
                  </Link>
                  <Link
                    href="/reports/journal"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    仕訳帳
                  </Link>
                  <Link
                    href="/reports/ledger"
                    className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors ml-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    総勘定元帳
                  </Link>
                </div>
              </div>
            </div>

            {/* ワークフローセクション */}
            <div className="space-y-3">
              <p className="text-lg font-bold text-foreground px-3 flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                ワークフロー
              </p>

              <div className="space-y-4 ml-4">
                <Link
                  href="/workflow/approval-list"
                  className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  承認対象一覧
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
