"use client";

import { Suspense, useState } from "react";
import { Header } from "@/components/layout/header";
import { EnhancedAnalysisCodeMasterList } from "@/components/accounting/enhanced-analysis-code-master-list";
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              分析コードマスタ
            </h1>
            <p className="text-muted-foreground">
              分析コードの作成、編集、削除を行います
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>分析コード一覧</CardTitle>
            <CardDescription>
              登録されている分析コードの一覧です。クリックして編集できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>読み込み中...</div>}>
              <EnhancedAnalysisCodeMasterList key={refreshTrigger} />
            </Suspense>
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新規分析コード作成</DialogTitle>
              <DialogDescription>
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
