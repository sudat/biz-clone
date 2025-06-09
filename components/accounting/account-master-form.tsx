"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Database } from "@/lib/database/types";
import { ClientAccountService } from "@/lib/adapters/client-data-adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  showSuccessToast,
  handleFormError 
} from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

const accountFormSchema = z.object({
  account_code: z
    .string()
    .min(1, "勘定科目コードは必須です")
    .max(10, "勘定科目コードは10文字以内で入力してください"),
  account_name: z
    .string()
    .min(1, "勘定科目名称は必須です")
    .max(100, "勘定科目名称は100文字以内で入力してください"),
  account_type: z.enum(["資産", "負債", "資本", "収益", "費用"], {
    required_error: "勘定科目種別を選択してください",
  }),
  parent_account_code: z.string().optional().nullable(),
  is_detail: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).optional().nullable(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

interface AccountMasterFormProps {
  account?: Account | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AccountMasterForm({
  account,
  onSubmit,
  onCancel,
}: AccountMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!account;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      account_code: account?.account_code || "",
      account_name: account?.account_name || "",
      account_type: account?.account_type || "資産",
      parent_account_code: account?.parent_account_code || null,
      is_detail: account?.is_detail ?? true,
      is_active: account?.is_active ?? true,
      sort_order: account?.sort_order || null,
    },
  });

  const handleSubmit = async (data: AccountFormData) => {
    setLoading(true);
    try {
      let result;
      if (isEditing && account) {
        // 更新
        const updateData: Database["public"]["Tables"]["accounts"]["Update"] = {
          account_name: data.account_name,
          account_type: data.account_type,
          parent_account_code: data.parent_account_code,
          is_detail: data.is_detail,
          is_active: data.is_active,
          sort_order: data.sort_order,
        };
        result = await ClientAccountService.updateAccount(
          account.account_code,
          updateData
        );
      } else {
        // 新規作成
        const insertData: Database["public"]["Tables"]["accounts"]["Insert"] = {
          account_code: data.account_code,
          account_name: data.account_name,
          account_type: data.account_type,
          parent_account_code: data.parent_account_code,
          is_detail: data.is_detail,
          is_active: data.is_active,
          sort_order: data.sort_order,
        };
        result = await ClientAccountService.createAccount(insertData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "勘定科目を更新しました" : "勘定科目を作成しました"
        );
        onSubmit();
      } else {
        handleFormError(result.error, form);
      }
    } catch (error) {
      console.error("勘定科目の保存エラー:", error);
      const systemError = createSystemError(
        "勘定科目の保存に失敗しました",
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
          name="account_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>勘定科目コード</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 1110"
                  disabled={isEditing || loading}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : "勘定科目を識別するコードを入力してください"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="account_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>勘定科目名称</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 現金" disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="account_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>勘定科目種別</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={loading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="種別を選択してください" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="資産">資産</SelectItem>
                  <SelectItem value="負債">負債</SelectItem>
                  <SelectItem value="資本">資本</SelectItem>
                  <SelectItem value="収益">収益</SelectItem>
                  <SelectItem value="費用">費用</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sort_order"
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
          name="is_detail"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">明細科目</FormLabel>
                <FormDescription>
                  仕訳で直接使用する科目の場合はオンにしてください
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

        <FormField
          control={form.control}
          name="is_active"
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
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : isEditing ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
