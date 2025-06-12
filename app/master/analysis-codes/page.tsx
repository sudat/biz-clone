"use client";

import { Suspense, useState } from "react";
import { Header } from "@/components/layout/header";
import { AnalysisCodeMasterList } from "@/components/accounting/analysis-code-master-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnalysisCodeMasterForm } from "@/components/accounting/analysis-code-master-form";

export default function AnalysisCodeMasterPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateSubmit = () => {
    setIsCreateDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1); // リスト再読み込みのトリガー
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Header />
      <main className="container mx-auto px-8 py-8 space-y-8 max-w-7xl">
        {/* ページヘッダー */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/40 backdrop-blur-sm rounded-xl p-6 shadow-md border">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              分析コードマスタ
            </h1>
            <p className="text-muted-foreground">
              分析コードの作成、編集、削除を行います
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="px-6 py-2 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>

        {/* メインコンテンツカード */}
        <Card className="shadow-xl border-0 bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/20 to-muted/10">
            <CardTitle className="text-2xl font-bold">分析コード一覧</CardTitle>
            <CardDescription className="text-base">
              登録されている分析コードの一覧です。クリックして編集できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-4 text-muted-foreground">
                    読み込み中...
                  </span>
                </div>
              }
            >
              <AnalysisCodeMasterList key={refreshTrigger} />
            </Suspense>
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg shadow-2xl border-0">
            <DialogHeader className="space-y-4 pb-6">
              <DialogTitle className="text-2xl font-bold">
                新規分析コード作成
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                新しい分析コードの情報を入力してください。
              </DialogDescription>
            </DialogHeader>
            <AnalysisCodeMasterForm
              onSubmit={handleCreateSubmit}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
