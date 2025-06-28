"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createDepartment, updateDepartment, checkDepartmentCodeExists, type DepartmentForClient } from "@/app/actions/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
const departmentFormSchema = z.object({
  departmentCode: z.string().min(1, "部門コードは必須です").max(10),
  departmentName: z.string().min(1, "部門名は必須です").max(100),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).optional().nullable(),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

interface DepartmentMasterFormProps {
  department?: DepartmentForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function DepartmentMasterForm({
  department,
  onSubmit,
  onCancel,
}: DepartmentMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const isEditing = !!department;

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      departmentCode: department?.departmentCode || "",
      departmentName: department?.departmentName || "",
      isActive: department?.isActive ?? true,
      sortOrder: department?.sortOrder || null,
    },
  });

  // 部門コードの重複チェック
  const checkDepartmentCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない
    
    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkDepartmentCodeExists(code);
      if (result.exists && result.department) {
        const dept = result.department;
        const status = dept.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${dept.departmentName} / ${status}）は既に使用されています。`
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

  const handleSubmit = async (data: DepartmentFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(createSystemError("部門コードが重複しています", "登録処理"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && department) {
        // 更新
        const formData = new FormData();
        formData.append('departmentName', data.departmentName);
        formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await updateDepartment(department.departmentCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append('departmentCode', data.departmentCode);
        formData.append('departmentName', data.departmentName);
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await createDepartment(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "計上部門を更新しました" : "計上部門を作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(createSystemError(String(result.error) || "エラーが発生しました", "バリデーションエラー"));
      }
    } catch (error) {
      console.error("計上部門の保存エラー:", error);
      const systemError = createSystemError(
        "計上部門の保存に失敗しました",
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
          name="departmentCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>部門コード *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: D001"
                  disabled={isEditing || loading}
                  onBlur={(e) => {
                    field.onBlur();
                    checkDepartmentCode(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : codeCheckMessage && !codeCheckError
                    ? "" // チェック成功時は説明文を非表示
                    : "部門を識別するコードを入力してください"}
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
          name="departmentName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>部門名称 *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 営業部" disabled={loading} />
              </FormControl>
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
                  value={field.value?.toString() ?? ""}
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
                  無効にすると新規仕訳で選択できなくなります
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