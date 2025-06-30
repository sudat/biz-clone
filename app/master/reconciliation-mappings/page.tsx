"use client";

import { Suspense, useState } from "react";
import { ReconciliationMappingList } from "@/components/accounting/reconciliation-mapping-list";
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
import { ReconciliationMappingForm } from "@/components/accounting/reconciliation-mapping-form";

export default function ReconciliationMappingPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateSubmit = () => {
    setIsCreateDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1); // リスト再読み込みのトリガー
  };

  return (
    <main className="space-y-4">
        {/* ページヘッダー */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/40 backdrop-blur-sm rounded-xl p-6 shadow-md border">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              勘定照合マスタ
            </h1>
            <p className="text-muted-foreground">
              勘定照合マスタの作成、編集、削除を行います
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="px-6 py-2 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>

        {/* メインコンテンツカード */}
        <Card className="shadow-xl border-0 bg-card/60 backdrop-blur-sm overflow-hidden gap-0">
          <CardHeader className="bg-gradient-to-r from-muted/20 to-muted/10">
            <CardTitle className="text-2xl font-bold">勘定照合マスタ一覧</CardTitle>
            <CardDescription className="text-base">
              登録されている勘定照合マスタの一覧です。クリックして編集できます。
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
              <ReconciliationMappingList key={refreshTrigger} />
            </Suspense>
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl border-0">
            <DialogHeader className="space-y-4 pb-6">
              <DialogTitle className="text-2xl font-bold">
                新規勘定照合マスタ作成
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                新しい勘定照合マスタの情報を入力してください。
              </DialogDescription>
            </DialogHeader>
            <ReconciliationMappingForm
              onSubmit={handleCreateSubmit}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
    </main>
  );
}