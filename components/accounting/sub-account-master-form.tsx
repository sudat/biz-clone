"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Database } from "@/lib/database/types";
import {
  ClientSubAccountService,
  ClientAccountService,
} from "@/lib/adapters/client-data-adapter";
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

type SubAccount = Database["public"]["Tables"]["sub_accounts"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface SubAccountWithAccount extends SubAccount {
  account?: {
    account_code: string;
    account_name: string;
  };
}

const subAccountFormSchema = z.object({
  account_code: z.string().min(1, "勘定科目は必須です"),
  sub_account_code: z
    .string()
    .min(1, "補助科目コードは必須です")
    .max(10, "補助科目コードは10文字以内で入力してください"),
  sub_account_name: z
    .string()
    .min(1, "補助科目名称は必須です")
    .max(100, "補助科目名称は100文字以内で入力してください"),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).optional().nullable(),
});

type SubAccountFormData = z.infer<typeof subAccountFormSchema>;

interface SubAccountMasterFormProps {
  subAccount?: SubAccountWithAccount | null;
  accounts?: Account[];
  onSubmit: () => void;
  onCancel: () => void;
}

export function SubAccountMasterForm({
  subAccount,
  accounts: propAccounts,
  onSubmit,
  onCancel,
}: SubAccountMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts || []);
  const isEditing = !!subAccount;

  const form = useForm<SubAccountFormData>({
    resolver: zodResolver(subAccountFormSchema),
    defaultValues: {
      account_code: subAccount?.account_code || "",
      sub_account_code: subAccount?.sub_account_code || "",
      sub_account_name: subAccount?.sub_account_name || "",
      is_active: subAccount?.is_active ?? true,
      sort_order: subAccount?.sort_order || null,
    },
  });

  useEffect(() => {
    if (!propAccounts || propAccounts.length === 0) {
      const loadAccounts = async () => {
        try {
          const result = await ClientAccountService.getAccounts();
          if (result.success && result.data) {
            setAccounts(result.data);
          }
        } catch (error) {
          console.error("勘定科目データの取得エラー:", error);
        }
      };
      loadAccounts();
    }
  }, [propAccounts]);

  const handleSubmit = async (data: SubAccountFormData) => {
    setLoading(true);
    try {
      let result;
      if (isEditing && subAccount) {
        const updateData: Database["public"]["Tables"]["sub_accounts"]["Update"] =
          {
            sub_account_name: data.sub_account_name,
            is_active: data.is_active,
            sort_order: data.sort_order,
          };
        result = await ClientSubAccountService.updateSubAccount(
          subAccount.account_code,
          subAccount.sub_account_code,
          updateData
        );
      } else {
        const insertData: Database["public"]["Tables"]["sub_accounts"]["Insert"] =
          {
            account_code: data.account_code,
            sub_account_code: data.sub_account_code,
            sub_account_name: data.sub_account_name,
            is_active: data.is_active,
            sort_order: data.sort_order,
          };
        result = await ClientSubAccountService.createSubAccount(insertData);
      }

      if (result.success) {
        onSubmit();
      } else {
        alert("保存エラー: " + result.error);
      }
    } catch (error) {
      console.error("補助科目の保存エラー:", error);
      alert("保存に失敗しました: " + error);
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
              <FormLabel>勘定科目</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isEditing || loading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="勘定科目を選択してください" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem
                      key={account.account_code}
                      value={account.account_code}
                    >
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {isEditing
                  ? "勘定科目は編集できません"
                  : "補助科目が属する勘定科目を選択してください"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sub_account_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>補助科目コード</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 001"
                  disabled={isEditing || loading}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : "補助科目を識別するコードを入力してください"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sub_account_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>補助科目名称</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: ○○銀行普通預金"
                  disabled={loading}
                />
              </FormControl>
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
