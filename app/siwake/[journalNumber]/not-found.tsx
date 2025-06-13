/**
 * 仕訳が見つからない場合のページ
 * ============================================================================
 * 無効な仕訳番号の場合に表示される404ページ
 * ============================================================================
 */

import Link from "next/link";
import { FileX, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FileX className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>仕訳が見つかりません</CardTitle>
          <CardDescription>
            指定された仕訳番号の仕訳が存在しないか、削除されている可能性があります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Link href="/siwake">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                仕訳一覧に戻る
              </Button>
            </Link>
            <Link href="/siwake/new">
              <Button variant="outline" className="w-full">
                新規仕訳を作成
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}