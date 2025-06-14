/**
 * 仕訳ページ共通レイアウト
 * ============================================================================
 * 仕訳関連ページの共通レイアウトとナビゲーション
 * ============================================================================
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '仕訳入力 | Biz Clone',
  description: '仕訳の作成・編集・管理を行います',
};

interface SiwakeLayoutProps {
  children: React.ReactNode;
}

export default function SiwakeLayout({ children }: SiwakeLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}