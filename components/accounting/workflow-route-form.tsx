"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createWorkflowRoute,
  updateWorkflowRoute,
  checkWorkflowRouteCodeExists,
  type WorkflowRouteForClient,
} from "@/app/actions/workflow-routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { showErrorToast, showSuccessToast } from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";

// フォームスキーマ
const routeFormSchema = z.object({
  routeCode: z
    .string()
    .min(1, "ルートコードは必須です")
    .max(20, "ルートコードは20文字以内で入力してください")
    .regex(/^[A-Za-z0-9_-]+$/, "ルートコードは英数字、ハイフン、アンダースコアのみ使用できます"),
  routeName: z
    .string()
    .min(1, "ルート名は必須です")
    .max(100, "ルート名は100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  sortOrder: z
    .union([
      z.string().length(0), // 空文字を許容
      z.string().regex(/^\d+$/, "表示順は数値で入力してください").transform(Number),
    ])
    .optional(),
  isActive: z.boolean(),
});

type RouteFormData = z.infer<typeof routeFormSchema>;

interface WorkflowRouteFormProps {
  route?: WorkflowRouteForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WorkflowRouteForm({
  route,
  onSubmit,
  onCancel,
}: WorkflowRouteFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);

  const isEditing = !!route;

  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      routeCode: route?.routeCode || "",
      routeName: route?.routeName || "",
      description: route?.description || "",
      sortOrder: route?.sortOrder?.toString() || "",
      isActive: route?.isActive ?? true,
    },
  });


  // ルートコードの重複チェック
  const checkRouteCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない

    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkWorkflowRouteCodeExists(code);
      if (result.exists && result.route) {
        const existingRoute = result.route;
        const status = existingRoute.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${existingRoute.routeName} / ${status}）は既に使用されています。`
        );
        setCodeCheckError(true);
      } else {
        setCodeCheckMessage("このコードは使用可能です。");
        setCodeCheckError(false);
      }
    } catch {
      setCodeCheckMessage("コードのチェックに失敗しました。");
      setCodeCheckError(true);
    } finally {
      setCodeCheckLoading(false);
    }
  };

  const handleSubmit = async (data: RouteFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(createSystemError("入力内容に問題があります", "登録処理"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && route) {
        // 更新
        const formData = new FormData();
        formData.append("routeName", data.routeName);
        if (data.description) formData.append("description", data.description);
        if (data.sortOrder) formData.append("sortOrder", data.sortOrder.toString());
        formData.append("isActive", data.isActive.toString());
        result = await updateWorkflowRoute(route.routeCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append("routeCode", data.routeCode);
        formData.append("routeName", data.routeName);
        if (data.description) formData.append("description", data.description);
        if (data.sortOrder) formData.append("sortOrder", data.sortOrder.toString());
        result = await createWorkflowRoute(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "ワークフロールートを更新しました" : "ワークフロールートを作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(
          result.error ||
            createSystemError("エラーが発生しました", "バリデーションエラー")
        );
      }
    } catch (error) {
      console.error("ワークフロールートの保存エラー:", error);
      const systemError = createSystemError(
        "ワークフロールートの保存に失敗しました",
        error instanceof Error ? error.message : "不明なエラー"
      );
      showErrorToast(systemError);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="routeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ルートコード *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="例: ROUTE001"
                      disabled={isEditing || loading}
                      onBlur={(e) => {
                        field.onBlur();
                        checkRouteCode(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEditing
                      ? "コードは編集できません"
                      : codeCheckMessage && !codeCheckError
                      ? "" // チェック成功時は説明文を非表示
                      : "ワークフロールートを識別するコードを入力してください（英数字、ハイフン、アンダースコア）"}
                  </FormDescription>

                  {/* 重複チェック結果の表示 */}
                  {!isEditing && (codeCheckLoading || codeCheckMessage) && (
                    <div
                      className={`text-sm mt-1 ${
                        codeCheckLoading
                          ? "text-gray-500"
                          : codeCheckError
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {codeCheckLoading ? "チェック中..." : codeCheckMessage}
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="routeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ルート名 *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="例: 経理承認ルート"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="ワークフロールートの説明を入力してください（省略可）"
                      disabled={loading}
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    ワークフロールートの用途や適用範囲を説明してください（最大1000文字）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>表示順</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="例: 1"
                      disabled={loading}
                      value={field.value || ""}
                      min="0"
                      max="999999"
                    />
                  </FormControl>
                  <FormDescription>
                    一覧での表示順を指定してください（省略可）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">有効</FormLabel>
                    <FormDescription>
                      無効にするとワークフローで使用できなくなります
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

          </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            disabled={loading || (!isEditing && codeCheckError)}
          >
            {loading ? "保存中..." : isEditing ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Form>

    </>
  );
}