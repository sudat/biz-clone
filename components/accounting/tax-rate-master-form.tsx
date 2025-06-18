"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createTaxRate,
  updateTaxRate,
  checkTaxCodeExists,
} from "@/app/actions/tax-rates";
import type { TaxRateForClient } from "@/types/unified";
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
import { showErrorToast, showSuccessToast } from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";

// 統一スキーマを使用（新規・更新共通）
const taxRateFormSchema = z.object({
  taxCode: z.string().min(1, "税区分コードは必須です").max(50),
  taxName: z.string().min(1, "税区分名は必須です").max(100),
  taxRate: z.number().min(0, "税率は0以上である必要があります").max(100, "税率は100以下である必要があります"),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).optional().nullable(),
});

type TaxRateFormData = z.infer<typeof taxRateFormSchema>;

interface TaxRateMasterFormProps {
  taxRate?: TaxRateForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function TaxRateMasterForm({
  taxRate,
  onSubmit,
  onCancel,
}: TaxRateMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const isEditing = !!taxRate;

  const form = useForm<TaxRateFormData>({
    resolver: zodResolver(taxRateFormSchema),
    defaultValues: {
      taxCode: taxRate?.taxCode || "",
      taxName: taxRate?.taxName || "",
      taxRate: taxRate?.taxRate || 0,
      isActive: taxRate?.isActive ?? true,
      sortOrder: taxRate?.sortOrder || null,
    },
  });

  // 税区分コードの重複チェック
  const checkTaxCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない

    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkTaxCodeExists(code);
      if (result.exists && result.taxRate) {
        const taxRate = result.taxRate;
        const status = taxRate.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${taxRate.taxName} / ${status}）は既に使用されています。`
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

  const handleSubmit = async (data: TaxRateFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(
        createSystemError("税区分コードが重複しています", "登録処理")
      );
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && taxRate) {
        // 更新
        const formData = new FormData();
        formData.append("taxName", data.taxName);
        formData.append("taxRate", data.taxRate.toString());
        formData.append("isActive", data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append("sortOrder", data.sortOrder.toString());
        }
        result = await updateTaxRate(taxRate.taxCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append("taxCode", data.taxCode);
        formData.append("taxName", data.taxName);
        formData.append("taxRate", data.taxRate.toString());
        formData.append("isActive", data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append("sortOrder", data.sortOrder.toString());
        }
        result = await createTaxRate(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "税区分を更新しました" : "税区分を作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(
          createSystemError(
            String(result.error) || "エラーが発生しました",
            "バリデーションエラー"
          )
        );
      }
    } catch (error) {
      console.error("税区分の保存エラー:", error);
      const systemError = createSystemError(
        "税区分の保存に失敗しました",
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
          name="taxCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>税区分コード *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: T10"
                  disabled={isEditing || loading}
                  onBlur={(e) => {
                    field.onBlur();
                    checkTaxCode(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : codeCheckMessage && !codeCheckError
                  ? "" // チェック成功時は説明文を非表示
                  : "税区分を識別するコードを入力してください"}
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
          name="taxName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>税区分名 *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 消費税10%" disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="taxRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>税率 (%) *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="例: 10"
                  disabled={loading}
                  step="0.01"
                  min="0"
                  max="100"
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? 0 : parseFloat(value));
                  }}
                  value={field.value?.toString() ?? ""}
                />
              </FormControl>
              <FormDescription>税率をパーセンテージで入力してください</FormDescription>
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
                  無効にすると仕訳登録時に選択できなくなります
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