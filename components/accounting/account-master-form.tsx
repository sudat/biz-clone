"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createAccount, updateAccount, checkAccountCodeExists, getAccounts, type AccountForClient } from "@/app/actions/accounts";
import { ACCOUNT_TYPE_LIST, ACCOUNT_TYPE_OPTIONS, type AccountType } from "@/types/master-types";
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
import { X } from "lucide-react";
import { 
  showErrorToast, 
  showSuccessToast
} from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";

// 統一スキーマを使用（新規・更新共通）
const accountFormSchema = z.object({
  accountCode: z.string().min(1, "勘定科目コードは必須です").max(10),
  accountName: z.string().min(1, "勘定科目名は必須です").max(100),
  accountType: z.enum(ACCOUNT_TYPE_LIST, {
    required_error: "勘定科目種別を選択してください",
  }),
  parentAccountCode: z.string().optional().nullable(),
  isDetail: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).optional().nullable(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

interface AccountMasterFormProps {
  account?: AccountForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AccountMasterForm({
  account,
  onSubmit,
  onCancel,
}: AccountMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const [parentAccountOptions, setParentAccountOptions] = useState<AccountForClient[]>([]);
  const [parentAccountsLoading, setParentAccountsLoading] = useState(false);
  const isEditing = !!account;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      accountCode: account?.accountCode || "",
      accountName: account?.accountName || "",
      accountType: (account?.accountType as AccountType) || "資産",
      parentAccountCode: account?.parentAccountCode || null,
      isDetail: account?.isDetail ?? true,
      isActive: account?.isActive ?? true,
      sortOrder: account?.sortOrder || null,
    },
  });

  // 循環参照チェック用のヘルパー関数
  const isDescendant = useCallback((targetCode: string, parentCode: string, accounts: AccountForClient[]): boolean => {
    const target = accounts.find(acc => acc.accountCode === targetCode);
    if (!target || !target.parentAccountCode) return false;
    if (target.parentAccountCode === parentCode) return true;
    return isDescendant(target.parentAccountCode, parentCode, accounts);
  }, []);

  // 親科目候補データを取得
  useEffect(() => {
    const loadParentAccountOptions = async () => {
      setParentAccountsLoading(true);
      try {
        const result = await getAccounts();
        if (result.success && result.data) {
          // 自分自身と循環参照になる科目を除外
          const filteredAccounts = result.data.filter(acc => {
            // 新規作成時は自分自身を除外する必要がない
            if (!isEditing) return true;
            // 編集時は自分自身を除外
            if (acc.accountCode === account?.accountCode) return false;
            // 循環参照防止：自分の子孫科目も除外
            if (isDescendant(acc.accountCode, account?.accountCode || "", result.data || [])) return false;
            return true;
          });
          setParentAccountOptions(filteredAccounts);
        }
      } catch (error) {
        console.error("親科目候補の取得に失敗:", error);
      } finally {
        setParentAccountsLoading(false);
      }
    };

    loadParentAccountOptions();
  }, [isEditing, account?.accountCode, isDescendant]);

  // 勘定科目コードの重複チェック
  const checkAccountCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない
    
    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkAccountCodeExists(code);
      if (result.exists && result.account) {
        const account = result.account;
        const status = account.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${account.accountName} / ${account.accountType} / ${status}）は既に使用されています。`
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

  const handleSubmit = async (data: AccountFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(createSystemError("勘定科目コードが重複しています", "登録処理"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && account) {
        // 更新
        const formData = new FormData();
        formData.append('accountName', data.accountName);
        formData.append('accountType', data.accountType);
        if (data.parentAccountCode) formData.append('parentAccountCode', data.parentAccountCode);
        formData.append('isDetail', data.isDetail.toString());
        formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await updateAccount(account.accountCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append('accountCode', data.accountCode);
        formData.append('accountName', data.accountName);
        formData.append('accountType', data.accountType);
        if (data.parentAccountCode) formData.append('parentAccountCode', data.parentAccountCode);
        formData.append('isDetail', data.isDetail.toString());
        formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== null && data.sortOrder !== undefined) {
          formData.append('sortOrder', data.sortOrder.toString());
        }
        result = await createAccount(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "勘定科目を更新しました" : "勘定科目を作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(createSystemError(result.error || "エラーが発生しました", "バリデーションエラー"));
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
          name="accountCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>勘定科目コード</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 1110"
                  disabled={isEditing || loading}
                  onBlur={(e) => {
                    field.onBlur();
                    checkAccountCode(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : codeCheckMessage && !codeCheckError
                    ? "" // チェック成功時は説明文を非表示
                    : "勘定科目を識別するコードを入力してください"}
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
          name="accountName"
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
          name="accountType"
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
                  {ACCOUNT_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentAccountCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>親科目</FormLabel>
              <div className="flex gap-2">
                <Select
                  onValueChange={(value) => field.onChange(value === "" ? null : value)}
                  value={field.value || ""}
                  disabled={loading || parentAccountsLoading}
                >
                  <FormControl>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="親科目を選択（省略可）" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parentAccountOptions.map(option => (
                      <SelectItem key={option.accountCode} value={option.accountCode}>
                        {option.accountCode} - {option.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange(null)}
                    disabled={loading || parentAccountsLoading}
                    className="px-3"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <FormDescription>
                {parentAccountsLoading 
                  ? "親科目候補を読み込み中..." 
                  : "階層構造を作成する場合に親科目を選択してください。クリアボタンで親科目を削除できます。"}
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
          name="isDetail"
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
