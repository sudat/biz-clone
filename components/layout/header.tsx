"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Menu, X } from "lucide-react";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <MenubarTrigger className="px-4 py-2 text-base font-medium hover:bg-accent/50 data-[state=open]:bg-accent/50 transition-colors">仕訳</MenubarTrigger>
            <MenubarContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
              <MenubarItem asChild>
                <Link href="/siwake/new" className="px-4 py-3 text-base">仕訳作成</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/siwake" className="px-4 py-3 text-base">仕訳照会</Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="px-4 py-2 text-base font-medium hover:bg-accent/50 data-[state=open]:bg-accent/50 transition-colors">マスタ</MenubarTrigger>
            <MenubarContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
              <MenubarItem asChild>
                <Link href="/master/accounts" className="px-4 py-3 text-base">勘定科目</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/master/sub-accounts" className="px-4 py-3 text-base">補助科目</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/master/partners" className="px-4 py-3 text-base">取引先</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/master/analysis-codes" className="px-4 py-3 text-base">分析コード</Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="px-4 py-2 text-base font-medium hover:bg-accent/50 data-[state=open]:bg-accent/50 transition-colors">レポート</MenubarTrigger>
            <MenubarContent className="shadow-xl border-0 bg-card/95 backdrop-blur-md">
              <MenubarItem asChild>
                <Link href="/reports/trial-balance" className="px-4 py-3 text-base">試算表</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/reports/journal" className="px-4 py-3 text-base">仕訳帳</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/reports/ledger" className="px-4 py-3 text-base">総勘定元帳</Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {/* 右側のアクション */}
        <div className="flex items-center space-x-3">
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
              <p className="text-base font-semibold text-foreground px-3">
                仕訳
              </p>
              <Link
                href="/siwake/new"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                仕訳作成
              </Link>
              <Link
                href="/siwake"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                仕訳照会
              </Link>
            </div>

            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground px-3">
                マスタ
              </p>
              <Link
                href="/master/accounts"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                勘定科目
              </Link>
              <Link
                href="/master/sub-accounts"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                補助科目
              </Link>
              <Link
                href="/master/partners"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                取引先
              </Link>
              <Link
                href="/master/analysis-codes"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                分析コード
              </Link>
            </div>

            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground px-3">
                レポート
              </p>
              <Link
                href="/reports/trial-balance"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                試算表
              </Link>
              <Link
                href="/reports/journal"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                仕訳帳
              </Link>
              <Link
                href="/reports/ledger"
                className="block px-3 py-3 text-base hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                総勘定元帳
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}