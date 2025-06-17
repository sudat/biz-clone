"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { WorkflowRouteFlowEditor } from "@/components/accounting/workflow-route-flow-editor";
import {
  getWorkflowRouteById,
  updateWorkflowRouteFlowConfig,
  type WorkflowRouteForClient,
} from "@/app/actions/workflow-routes";
import {
  getWorkflowOrganizations,
  type WorkflowOrganizationForClient,
} from "@/app/actions/workflow-organizations";
import { showErrorToast, showSuccessToast } from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function WorkflowRouteFlowConfigPage() {
  const router = useRouter();
  const params = useParams();
  const routeCode = params.routeCode as string;

  const [route, setRoute] = useState<WorkflowRouteForClient | null>(null);
  const [organizations, setOrganizations] = useState<
    WorkflowOrganizationForClient[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 並行してルート情報と組織情報を取得
        const [routeResult, orgResult] = await Promise.all([
          getWorkflowRouteById(routeCode),
          getWorkflowOrganizations(),
        ]);

        if (routeResult.success && routeResult.data) {
          setRoute(routeResult.data);
        } else {
          showErrorToast(
            createSystemError(
              routeResult.error || "ワークフロールートの取得に失敗しました",
              "データ取得エラー"
            )
          );
          router.push("/master/workflow-routes");
          return;
        }

        if (orgResult.success && orgResult.data) {
          setOrganizations(orgResult.data);
        } else {
          showErrorToast(
            createSystemError(
              orgResult.error || "ワークフロー組織の取得に失敗しました",
              "データ取得エラー"
            )
          );
        }
      } catch (error) {
        console.error("データ取得エラー:", error);
        showErrorToast(
          createSystemError(
            "データの取得に失敗しました",
            error instanceof Error ? error.message : "不明なエラー"
          )
        );
        router.push("/master/workflow-routes");
      } finally {
        setLoading(false);
      }
    };

    if (routeCode) {
      fetchData();
    }
  }, [routeCode, router]);

  // フロー設定保存処理
  const handleFlowConfigSave = async (flowConfig: unknown) => {
    if (!route) return;

    try {
      setSaving(true);

      const result = await updateWorkflowRouteFlowConfig(
        route.routeCode,
        flowConfig
      );

      if (result.success) {
        showSuccessToast("フロー設定を保存しました");
        // ルート情報を再取得して最新状態にする
        const updatedResult = await getWorkflowRouteById(routeCode);
        if (updatedResult.success && updatedResult.data) {
          setRoute(updatedResult.data);
        }
      } else {
        showErrorToast(
          result.error ||
            createSystemError("フロー設定の保存に失敗しました", "保存エラー")
        );
      }
    } catch (error) {
      console.error("フロー設定保存エラー:", error);
      showErrorToast(
        createSystemError(
          "フロー設定の保存に失敗しました",
          error instanceof Error ? error.message : "不明なエラー"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push("/master/workflow-routes");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">読み込み中...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">ワークフロールートが見つかりません</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* メインヘッダー */}
      <div className="flex items-center gap-4 mb-4">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          一覧に戻る
        </Button>
        <h1 className="text-3xl font-bold">承認フロー設定</h1>
      </div>

      {/* ルート情報ヘッダー */}
      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">{route.routeName}</span>
              <span className="text-sm text-gray-600">({route.routeCode})</span>
              <Badge variant={route.isActive ? "default" : "secondary"}>
                {route.isActive ? "有効" : "無効"}
              </Badge>
            </div>
            {route.description && (
              <div className="text-sm text-gray-600 max-w-md">
                {route.description}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* フローエディター */}
      <Card className="min-h-[calc(100vh-200px)]">
        <CardHeader>
          <CardTitle>承認フロー図</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <WorkflowRouteFlowEditor
            organizations={organizations}
            initialFlowConfig={
              route.flowConfigJson
                ? typeof route.flowConfigJson === "string"
                  ? JSON.parse(route.flowConfigJson)
                  : route.flowConfigJson
                : undefined
            }
            onSave={handleFlowConfigSave}
            saving={saving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
