/**
 * アプリケーション404ページ
 * ============================================================================
 * Next.js App Routerでのアプリケーション全体の404ページ
 * ============================================================================
 */

import Link from "next/link";
import { FileX, ArrowLeft, Home, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FileX className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>ページが見つかりません</CardTitle>
          <CardDescription>
            お探しのページは存在しないか、移動または削除されている可能性があります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Link href="/">
              <Button className="w-full">
                <Home className="h-4 w-4 mr-2" />
                ホームに戻る
              </Button>
            </Link>
            <Link href="/siwake">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                仕訳一覧
              </Button>
            </Link>
            <Link href="/siwake/new">
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                新規仕訳作成
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              よく使用されるページ:
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <Link href="/master/accounts">
                <Button variant="ghost" size="sm">勘定科目</Button>
              </Link>
              <Link href="/master/partners">
                <Button variant="ghost" size="sm">取引先</Button>
              </Link>
              <Link href="/master/analysis-codes">
                <Button variant="ghost" size="sm">分析コード</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}