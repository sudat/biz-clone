"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  createReconciliationMapping, 
  updateReconciliationMapping, 
  checkReconciliationMappingExists,
  getDepartments,
  getAccountsForSelection,
  type ReconciliationMappingForClient 
} from "@/app/actions/reconciliation-mappings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// 統一スキーマを使用（新規・更新共通）
const reconciliationMappingFormSchema = z.object({
  departmentCode: z.string().min(1, "計上部門コードは必須です"),
  accountCode: z.string().min(1, "勘定科目コードは必須です"),
  counterDepartmentCode: z.string().min(1, "相手計上部門コードは必須です"),
  counterAccountCode: z.string().min(1, "相手勘定科目コードは必須です"),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type ReconciliationMappingFormData = z.infer<typeof reconciliationMappingFormSchema>;

interface ReconciliationMappingFormProps {
  mapping?: ReconciliationMappingForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ReconciliationMappingForm({
  mapping,
  onSubmit,
  onCancel,
}: ReconciliationMappingFormProps) {
  const [loading, setLoading] = useState(false);
  const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false);
  const [duplicateCheckMessage, setDuplicateCheckMessage] = useState<string>("");
  const [duplicateCheckError, setDuplicateCheckError] = useState<boolean>(false);
  const [departments, setDepartments] = useState<{ departmentCode: string; departmentName: string }[]>([]);
  const [accounts, setAccounts] = useState<{ accountCode: string; accountName: string }[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  
  const isEditing = !!mapping;

  const form = useForm<ReconciliationMappingFormData>({
    resolver: zodResolver(reconciliationMappingFormSchema),
    defaultValues: {
      departmentCode: mapping?.departmentCode || "",
      accountCode: mapping?.accountCode || "",
      counterDepartmentCode: mapping?.counterDepartmentCode || "",
      counterAccountCode: mapping?.counterAccountCode || "",
      description: mapping?.description || null,
      isActive: mapping?.isActive ?? true,
    },
  });

  // 部門一覧データを取得
  useEffect(() => {
    const loadDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const result = await getDepartments();
        if (result.success && result.data) {
          setDepartments(result.data);
        }
      } catch (error) {
        console.error("部門一覧の取得に失敗:", error);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    loadDepartments();
  }, []);

  // 勘定科目一覧データを取得
  useEffect(() => {
    const loadAccounts = async () => {
      setAccountsLoading(true);
      try {
        const result = await getAccountsForSelection();
        if (result.success && result.data) {
          setAccounts(result.data);
        }
      } catch (error) {
        console.error("勘定科目一覧の取得に失敗:", error);
      } finally {
        setAccountsLoading(false);
      }
    };

    loadAccounts();
  }, []);

  // 重複チェック
  const checkDuplicate = async (
    departmentCode: string,
    accountCode: string, 
    counterDepartmentCode: string,
    counterAccountCode: string
  ) => {
    if (!departmentCode || !accountCode || !counterDepartmentCode || !counterAccountCode) {
      setDuplicateCheckMessage("");
      setDuplicateCheckError(false);
      return;
    }

    setDuplicateCheckLoading(true);
    setDuplicateCheckMessage("");
    setDuplicateCheckError(false);

    try {
      const result = await checkReconciliationMappingExists(
        departmentCode,
        accountCode,
        counterDepartmentCode,
        counterAccountCode,
        isEditing ? mapping?.mappingId : undefined
      );
      
      if (result.exists) {
        setDuplicateCheckMessage(
          `この組み合わせは既に登録されています。`
        );
        setDuplicateCheckError(true);
      } else {
        setDuplicateCheckMessage("この組み合わせは使用可能です。");
        setDuplicateCheckError(false);
      }
    } catch {
      setDuplicateCheckMessage("重複チェックに失敗しました。");
      setDuplicateCheckError(true);
    } finally {
      setDuplicateCheckLoading(false);
    }
  };

  // フォームの値変更時に重複チェック（摘要欄は除外）
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // 摘要欄（description）の変更時は重複チェックをしない
      if (name === "description") {
        return;
      }
      
      if (value.departmentCode && value.accountCode && value.counterDepartmentCode && value.counterAccountCode) {
        checkDuplicate(
          value.departmentCode,
          value.accountCode,
          value.counterDepartmentCode,
          value.counterAccountCode
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, isEditing, mapping?.mappingId]);

  const handleSubmit = async (data: ReconciliationMappingFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && duplicateCheckError) {
      showErrorToast(createSystemError("この組み合わせは既に登録されています", "登録処理"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && mapping) {
        // 更新
        const formData = new FormData();
        formData.append('departmentCode', data.departmentCode);
        formData.append('accountCode', data.accountCode);
        formData.append('counterDepartmentCode', data.counterDepartmentCode);
        formData.append('counterAccountCode', data.counterAccountCode);
        if (data.description) formData.append('description', data.description);
        formData.append('isActive', data.isActive.toString());
        result = await updateReconciliationMapping(mapping.mappingId, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append('departmentCode', data.departmentCode);
        formData.append('accountCode', data.accountCode);
        formData.append('counterDepartmentCode', data.counterDepartmentCode);
        formData.append('counterAccountCode', data.counterAccountCode);
        if (data.description) formData.append('description', data.description);
        result = await createReconciliationMapping(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "勘定照合マスタを更新しました" : "勘定照合マスタを作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(createSystemError(String(result.error) || "エラーが発生しました", "バリデーションエラー"));
      }
    } catch (error) {
      console.error("勘定照合マスタの保存エラー:", error);
      const systemError = createSystemError(
        "勘定照合マスタの保存に失敗しました",
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="departmentCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>計上部門コード *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={loading || departmentsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="部門を選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.departmentCode} value={dept.departmentCode}>
                        {dept.departmentCode} - {dept.departmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departmentsLoading && (
                  <FormDescription>
                    部門一覧を読み込み中...
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>勘定科目コード *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={loading || accountsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="勘定科目を選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.accountCode} value={account.accountCode}>
                        {account.accountCode} - {account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {accountsLoading && (
                  <FormDescription>
                    勘定科目一覧を読み込み中...
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="counterDepartmentCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>相手計上部門コード *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={loading || departmentsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="相手部門を選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.departmentCode} value={dept.departmentCode}>
                        {dept.departmentCode} - {dept.departmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departmentsLoading && (
                  <FormDescription>
                    部門一覧を読み込み中...
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="counterAccountCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>相手勘定科目コード *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={loading || accountsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="相手勘定科目を選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.accountCode} value={account.accountCode}>
                        {account.accountCode} - {account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {accountsLoading && (
                  <FormDescription>
                    勘定科目一覧を読み込み中...
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 重複チェック結果の表示 */}
        {(duplicateCheckLoading || duplicateCheckMessage) && (
          <div className={`text-sm p-3 rounded-md border ${
            duplicateCheckLoading 
              ? "text-gray-500 bg-gray-50" 
              : duplicateCheckError 
                ? "text-red-600 bg-red-50 border-red-200" 
                : "text-green-600 bg-green-50 border-green-200"
          }`}>
            {duplicateCheckLoading ? "重複をチェック中..." : duplicateCheckMessage}
          </div>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="勘定照合マスタの説明（省略可）" 
                  disabled={loading}
                  value={field.value || ""}
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                この勘定照合マスタの用途や注意事項を記載してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">有効</FormLabel>
                  <FormDescription>
                    無効にすると仕訳処理等で使用できなくなります
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
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={loading || (!isEditing && duplicateCheckError)}>
            {loading ? "保存中..." : isEditing ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Form>
  );
}