/**
 * レポート共通レイアウト
 * ============================================================================
 * 各種レポートページの共通レイアウトとナビゲーション
 * ============================================================================
 */

import { Metadata } from 'next';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  title: 'レポート | Biz Clone',
  description: '会計データの各種レポートを確認できます',
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Header />
      <div className="container mx-auto px-8 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* レポートヘッダー */}
          <div className="border-b pb-4">
            <h1 className="text-3xl font-bold tracking-tight">レポート</h1>
            <p className="text-muted-foreground mt-2">
              会計データの各種レポートを確認できます
            </p>
          </div>

          {/* レポートコンテンツ */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}