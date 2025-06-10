/**
 * 仕訳一覧ページ
 * ============================================================================
 * 仕訳の一覧表示・検索・フィルタリング機能を提供
 * ============================================================================
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Plus, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: '仕訳一覧 | Biz Clone',
  description: '仕訳の一覧表示と検索',
};

export default function SiwakePage() {
  return (
    <div className="space-y-8">
      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/40 backdrop-blur-sm rounded-xl p-6 shadow-md border">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">仕訳一覧</h1>
          <p className="text-muted-foreground">
            仕訳の作成・編集・管理を行います
          </p>
        </div>
        <Link href="/siwake/new">
          <Button className="px-6 py-2 shadow-md hover:shadow-lg transition-all duration-300">
            <Plus className="mr-2 h-4 w-4" />
            新規仕訳作成
          </Button>
        </Link>
      </div>

      {/* 機能カード */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group">
          <CardHeader className="pb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">新規作成</CardTitle>
            <CardDescription className="text-base">
              新しい仕訳を作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/siwake/new">
              <Button className="w-full py-6 text-lg shadow-md hover:shadow-lg transition-all duration-300">
                仕訳作成
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group">
          <CardHeader className="pb-6">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <FileText className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardTitle className="text-xl">仕訳一覧</CardTitle>
            <CardDescription className="text-base">
              登録済みの仕訳を表示・編集します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full py-6 text-lg shadow-md" disabled>
              一覧表示（実装予定）
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group">
          <CardHeader className="pb-6">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <Search className="h-6 w-6 text-accent-foreground" />
            </div>
            <CardTitle className="text-xl">仕訳検索</CardTitle>
            <CardDescription className="text-base">
              条件を指定して仕訳を検索します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full py-6 text-lg shadow-md" disabled>
              検索機能（実装予定）
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 今後実装予定の仕訳一覧コンポーネントエリア */}
      <Card className="shadow-xl border-0 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/20 to-muted/10 pb-8">
          <CardTitle className="text-2xl font-bold">最近の仕訳</CardTitle>
          <CardDescription className="text-base">
            最近作成された仕訳の一覧（実装予定）
          </CardDescription>
        </CardHeader>
        <CardContent className="p-12">
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-6">
              <FileText className="h-12 w-12 opacity-50" />
            </div>
            <h3 className="text-xl font-semibold mb-4">仕訳一覧コンポーネントを実装中です</h3>
            <p className="text-base mb-6">まずは上の「新規仕訳作成」ボタンから仕訳を作成してください</p>
            <Link href="/siwake/new">
              <Button className="px-8 py-3">
                <Plus className="mr-2 h-4 w-4" />
                仕訳を作成する
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}