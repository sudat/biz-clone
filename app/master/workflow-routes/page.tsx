"use client";

import { useState, useEffect } from "react";
import { WorkflowRouteList } from "@/components/accounting/workflow-route-list";
import { WorkflowRouteForm } from "@/components/accounting/workflow-route-form";
import { type WorkflowRouteForClient } from "@/app/actions/workflow-routes";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkflowRoutesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<WorkflowRouteForClient | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingRoute(null);
    setIsFormOpen(true);
  };

  const handleEdit = (route: WorkflowRouteForClient) => {
    setEditingRoute(route);
    setIsFormOpen(true);
  };

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setEditingRoute(null);
    setRefreshTrigger(prev => prev + 1); // リストを更新
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingRoute(null);
  };


  return (
    <main className="space-y-4">
        {/* ページヘッダー */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/40 backdrop-blur-sm rounded-xl p-6 shadow-md border">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              ワークフロールートマスタ
            </h1>
            <p className="text-muted-foreground">
              承認ワークフローのルートを管理します。組織間の承認フローを視覚的に設定できます。
            </p>
          </div>
          <Button
            onClick={handleAdd}
            className="px-6 py-2 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>

        {/* メインコンテンツカード */}
        <Card className="shadow-xl border-0 bg-card/60 backdrop-blur-sm overflow-hidden gap-0">
          <CardHeader className="bg-gradient-to-r from-muted/20 to-muted/10">
            <CardTitle className="text-2xl font-bold">ワークフロールート一覧</CardTitle>
            <CardDescription className="text-base">
              登録されているワークフロールートの一覧です。クリックして編集できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <WorkflowRouteList
              onEdit={handleEdit}
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl border-0">
            <DialogHeader className="space-y-4 pb-6">
              <DialogTitle className="text-2xl font-bold">
                {editingRoute ? "ワークフロールート編集" : "ワークフロールート新規作成"}
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {editingRoute ? "ワークフロールートの情報を編集してください。" : "新しいワークフロールートの情報を入力してください。"}
              </DialogDescription>
            </DialogHeader>
            <WorkflowRouteForm
              route={editingRoute}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
    </main>
  );
}