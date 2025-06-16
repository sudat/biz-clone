"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createWorkflowOrganization,
  updateWorkflowOrganization,
  checkOrganizationCodeExists,
  type WorkflowOrganizationForClient,
} from "@/app/actions/workflow-organizations";
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

// 統一スキーマを使用（新規・更新共通）
const organizationFormSchema = z.object({
  organizationCode: z
    .string()
    .min(1, "組織コードは必須です")
    .max(20, "組織コードは20文字以内で入力してください")
    .regex(/^[A-Za-z0-9_-]+$/, "組織コードは英数字、ハイフン、アンダースコアのみ使用できます"),
  organizationName: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
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

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface WorkflowOrganizationFormProps {
  organization?: WorkflowOrganizationForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WorkflowOrganizationForm({
  organization,
  onSubmit,
  onCancel,
}: WorkflowOrganizationFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const isEditing = !!organization;

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      organizationCode: organization?.organizationCode || "",
      organizationName: organization?.organizationName || "",
      description: organization?.description || "",
      sortOrder: organization?.sortOrder?.toString() || "",
      isActive: organization?.isActive ?? true,
    },
  });

  // 組織コードの重複チェック
  const checkOrganizationCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない

    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkOrganizationCodeExists(code);
      if (result.exists && result.organization) {
        const org = result.organization;
        const status = org.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${org.organizationName} / ${status}）は既に使用されています。`
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

  const handleSubmit = async (data: OrganizationFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(createSystemError("入力内容に問題があります", "登録処理"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && organization) {
        // 更新
        const formData = new FormData();
        formData.append("organizationName", data.organizationName);
        if (data.description) formData.append("description", data.description);
        if (data.sortOrder) formData.append("sortOrder", data.sortOrder.toString());
        formData.append("isActive", data.isActive.toString());
        result = await updateWorkflowOrganization(organization.organizationCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append("organizationCode", data.organizationCode);
        formData.append("organizationName", data.organizationName);
        if (data.description) formData.append("description", data.description);
        if (data.sortOrder) formData.append("sortOrder", data.sortOrder.toString());
        result = await createWorkflowOrganization(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "ワークフロー組織を更新しました" : "ワークフロー組織を作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(
          result.error ||
            createSystemError("エラーが発生しました", "バリデーションエラー")
        );
      }
    } catch (error) {
      console.error("ワークフロー組織の保存エラー:", error);
      const systemError = createSystemError(
        "ワークフロー組織の保存に失敗しました",
        error instanceof Error ? error.message : "不明なエラー"
      );
      showErrorToast(systemError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="organizationCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>組織コード *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: ORG001"
                  disabled={isEditing || loading}
                  onBlur={(e) => {
                    field.onBlur();
                    checkOrganizationCode(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : codeCheckMessage && !codeCheckError
                  ? "" // チェック成功時は説明文を非表示
                  : "ワークフロー組織を識別するコードを入力してください（英数字、ハイフン、アンダースコア）"}
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
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>組織名 *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 経理部"
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
                  placeholder="組織の説明を入力してください（省略可）"
                  disabled={loading}
                  value={field.value || ""}
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                組織の役割や業務内容を説明してください（最大1000文字）
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
  );
}