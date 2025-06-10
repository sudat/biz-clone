import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Receipt, BarChart3, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      <main className="container mx-auto px-8 py-16 max-w-7xl">
        {/* ヒーローセクション */}
        <div className="text-center space-y-12 mb-20">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Biz Clone 会計システム
            </h1>
            <p className="mx-auto max-w-[700px] text-xl text-muted-foreground leading-relaxed">
              Next.js + Supabase + Prisma + Shadcn/UI で構築された
              <br />
              現代的でモダンな会計システム
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link href="/siwake/new">
              <Button size="lg" className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300">
                <FileText className="mr-2 h-5 w-5" />
                仕訳を作成する
              </Button>
            </Link>
            <Link href="/siwake">
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300">
                <BarChart3 className="mr-2 h-5 w-5" />
                仕訳を確認する
              </Button>
            </Link>
          </div>
        </div>

        {/* 機能概要カード */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">仕訳管理</CardTitle>
              <CardDescription className="text-base">
                複式簿記による正確な仕訳の作成と管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/siwake">
                <Button variant="ghost" className="w-full justify-start">
                  仕訳機能へ
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle className="text-xl">マスタ管理</CardTitle>
              <CardDescription className="text-base">
                勘定科目、取引先、分析コードの統合管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/master/accounts">
                <Button variant="ghost" className="w-full justify-start">
                  マスタ管理へ
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-xl">レポート</CardTitle>
              <CardDescription className="text-base">
                試算表、仕訳帳、総勘定元帳の出力
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start" disabled>
                レポート機能（実装予定）
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* システム特徴 */}
        <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-12 shadow-lg border">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">システムの特徴</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              最新技術スタックと日本の会計基準に準拠した設計
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">モダン設計</h3>
              <p className="text-sm text-muted-foreground">
                Next.js 15とReact 19による最新のフロントエンド
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                <Receipt className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">複式簿記</h3>
              <p className="text-sm text-muted-foreground">
                日本の会計基準に準拠した正確な仕訳システム
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg">統合管理</h3>
              <p className="text-sm text-muted-foreground">
                マスタデータの一元管理とリアルタイム同期
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">リアルタイム</h3>
              <p className="text-sm text-muted-foreground">
                Supabaseによるリアルタイムデータ同期
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
