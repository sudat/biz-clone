"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SubAccount } from "@/lib/database/prisma";
import { createSubAccount, updateSubAccount, checkSubAccountCodeExists } from "@/app/actions/sub-accounts";
import { getAccounts, type AccountForClient } from "@/app/actions/accounts";
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
  showSuccessToast
} from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";

interface SubAccountWithAccount extends SubAccount {
  account?: {
    accountCode: string;
    accountName: string;
  };
}

const subAccountFormSchema = z.object({
  accountCode: z.string().min(1, "勘定科目は必須です"),
  subAccountCode: z
    .string()
    .min(1, "補助科目コードは必須です")
    .max(10, "補助科目コードは10文字以内で入力してください"),
  subAccountName: z
    .string()
    .min(1, "補助科目名称は必須です")
    .max(100, "補助科目名称は100文字以内で入力してください"),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).optional().nullable(),
});

type SubAccountFormData = z.infer<typeof subAccountFormSchema>;

interface SubAccountMasterFormProps {
  subAccount?: SubAccountWithAccount | null;
  accounts?: AccountForClient[];
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
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<AccountForClient[]>(propAccounts || []);
  const isEditing = !!subAccount;

  const form = useForm<SubAccountFormData>({
    resolver: zodResolver(subAccountFormSchema),
    defaultValues: {
      accountCode: subAccount?.accountCode || "",
      subAccountCode: subAccount?.subAccountCode || "",
      subAccountName: subAccount?.subAccountName || "",
      isActive: subAccount?.isActive ?? true,
      sortOrder: subAccount?.sortOrder || null,
    },
  });

  useEffect(() => {
    if (!propAccounts || propAccounts.length === 0) {
      const loadAccounts = async () => {
        try {
          const result = await getAccounts();
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

  // 補助科目コードの重複チェック
  const checkSubAccountCode = async (accountCode: string, subAccountCode: string) => {
    if (!accountCode || !subAccountCode || isEditing) return; // 編集時はチェックしない
    
    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkSubAccountCodeExists(accountCode, subAccountCode);
      if (result.exists && result.subAccount) {
        const subAccount = result.subAccount;
        const status = subAccount.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${subAccount.account?.accountName} / ${subAccount.subAccountName} / ${status}）は既に使用されています。`
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

  const handleSubmit = async (data: SubAccountFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(createSystemError("補助科目コードが重複しています", "登録処理"));
      return;
    }
    setLoading(true);
    try {
      let result;
      if (isEditing && subAccount) {
        const formData = new FormData();
        formData.append('subAccountName', data.subAccountName);
        formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await updateSubAccount(
          subAccount.accountCode,
          subAccount.subAccountCode,
          formData
        );
      } else {
        const formData = new FormData();
        formData.append('accountCode', data.accountCode);
        formData.append('subAccountCode', data.subAccountCode);
        formData.append('subAccountName', data.subAccountName);
        formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await createSubAccount(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "補助科目を更新しました" : "補助科目を作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(createSystemError(result.error || "エラーが発生しました", "バリデーションエラー"));
      }
    } catch (error) {
      console.error("補助科目の保存エラー:", error);
      const systemError = createSystemError(
        "補助科目の保存に失敗しました",
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
          name="accountCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>勘定科目 *</FormLabel>
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
                      key={account.accountCode}
                      value={account.accountCode}
                    >
                      {account.accountCode} - {account.accountName}
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
          name="subAccountCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>補助科目コード *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 001"
                  disabled={isEditing || loading}
                  onBlur={(e) => {
                    field.onBlur();
                    const accountCode = form.getValues("accountCode");
                    checkSubAccountCode(accountCode, e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : codeCheckMessage && !codeCheckError
                    ? "" // チェック成功時は説明文を非表示
                    : "補助科目を識別するコードを入力してください"}
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
          name="subAccountName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>補助科目名称 *</FormLabel>
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
