/**
 * 仕訳ページ共通レイアウト
 * ============================================================================
 * 仕訳関連ページの共通レイアウトとナビゲーション
 * ============================================================================
 */

import { Metadata } from 'next';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  title: '仕訳入力 | Biz Clone',
  description: '仕訳の作成・編集・管理を行います',
};

interface SiwakeLayoutProps {
  children: React.ReactNode;
}

export default function SiwakeLayout({ children }: SiwakeLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Header />
      <div className="container mx-auto px-8 py-8 max-w-7xl">
        {children}
      </div>
    </div>
  );
}