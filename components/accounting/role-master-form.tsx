"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createRole, updateRole, checkRoleCodeExists, type RoleForClient } from "@/app/actions/roles";
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
import { 
  showErrorToast, 
  showSuccessToast
} from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";

// 統一スキーマを使用（新規・更新共通）
const roleFormSchema = z.object({
  roleCode: z.string().min(1, "ロールコードは必須です").max(50),
  roleName: z.string().min(1, "ロール名は必須です").max(100),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).optional().nullable(),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

interface RoleMasterFormProps {
  role?: RoleForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RoleMasterForm({
  role,
  onSubmit,
  onCancel,
}: RoleMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const isEditing = !!role;

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      roleCode: role?.roleCode || "",
      roleName: role?.roleName || "",
      description: role?.description || "",
      isActive: role?.isActive ?? true,
      sortOrder: role?.sortOrder || null,
    },
  });

  // ロールコードの重複チェック
  const checkRoleCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない
    
    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkRoleCodeExists(code);
      if (result.exists && result.role) {
        const role = result.role;
        const status = role.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${role.roleName} / ${status}）は既に使用されています。`
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

  const handleSubmit = async (data: RoleFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(createSystemError("ロールコードが重複しています", "登録処理"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && role) {
        // 更新
        const formData = new FormData();
        formData.append('roleName', data.roleName);
        if (data.description) formData.append('description', data.description);
        formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await updateRole(role.roleCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append('roleCode', data.roleCode);
        formData.append('roleName', data.roleName);
        if (data.description) formData.append('description', data.description);
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await createRole(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "ロールを更新しました" : "ロールを作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(createSystemError(String(result.error) || "エラーが発生しました", "バリデーションエラー"));
      }
    } catch (error) {
      console.error("ロールの保存エラー:", error);
      const systemError = createSystemError(
        "ロールの保存に失敗しました",
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
          name="roleCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ロールコード *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: ADMIN"
                  disabled={isEditing || loading}
                  onBlur={(e) => {
                    field.onBlur();
                    checkRoleCode(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : codeCheckMessage && !codeCheckError
                    ? "" // チェック成功時は説明文を非表示
                    : "ロールを識別するコードを入力してください"}
              </FormDescription>
              
              {/* 重複チェック結果の表示 */}
              {!isEditing && (codeCheckLoading || codeCheckMessage) && (
                <div className={`text-sm mt-1 ${
                  codeCheckLoading 
                    ? "text-gray-500" 
                    : codeCheckError 
                      ? "text-red-600" 
                      : "text-green-600"
                }`}>
                  {codeCheckLoading ? "チェック中..." : codeCheckMessage}
                </div>
              )}
              
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roleName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ロール名 *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 管理者" disabled={loading} />
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
                  placeholder="ロールの説明を入力してください（省略可）"
                  disabled={loading}
                  rows={3}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                ロールの役割や権限について説明を記載してください
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
              <FormLabel>並び順</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="例: 100"
                  disabled={loading}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? null : parseInt(value));
                  }}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>表示順序を指定します（省略可）</FormDescription>
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
                  無効にするとユーザーに割り当てできなくなります
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
          <Button type="submit" disabled={loading || (!isEditing && codeCheckError)}>
            {loading ? "保存中..." : isEditing ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Form>
  );
}