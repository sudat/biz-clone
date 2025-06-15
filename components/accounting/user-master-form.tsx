"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createUser,
  updateUser,
  checkUserCodeExists,
  checkEmailExists,
  type UserForClient,
} from "@/app/actions/users";
import { getActiveRoles } from "@/app/actions/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleSelectDialog } from "@/components/accounting/role-select-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// Select components removed - using dialog instead
import { Switch } from "@/components/ui/switch";
import { showErrorToast, showSuccessToast } from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";
import { Eye, EyeOff, Search } from "lucide-react";

// 統一スキーマを使用（新規・更新共通）
const userFormSchema = z
  .object({
    userCode: z.string().min(1, "ユーザーコードは必須です").max(20),
    userName: z.string().min(1, "ユーザー名は必須です").max(100),
    userKana: z.string().max(100).optional(),
    email: z.string().email("正しいメールアドレスを入力してください").max(100),
    password: z.union([
      z.string().length(0), // 編集時など空文字を許容
      z.string().min(8, "パスワードは8文字以上である必要があります").max(255),
    ]),
    confirmPassword: z.union([
      z.string().length(0),
      z.string().min(8, "パスワードは8文字以上である必要があります").max(255),
    ]),
    roleCode: z.string().min(1, "ロールは必須です").max(20),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      // 新規作成時（パスワードがある場合）のみ、パスワード確認をチェック
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "パスワードが一致しません",
      path: ["confirmPassword"],
    }
  );

type UserFormData = z.infer<typeof userFormSchema>;

interface UserMasterFormProps {
  user?: UserForClient | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function UserMasterForm({
  user,
  onSubmit,
  onCancel,
}: UserMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailCheckMessage, setEmailCheckMessage] = useState<string>("");
  const [emailCheckError, setEmailCheckError] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<
    { roleCode: string; roleName: string }[]
  >([]);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const isEditing = !!user;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      userCode: user?.userCode || "",
      userName: user?.userName || "",
      userKana: user?.userKana || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
      roleCode: user?.roleCode || "",
      isActive: user?.isActive ?? true,
    },
  });

  // ロール一覧の取得関数をコンポーネントレベルで定義
  const loadRoles = async () => {
    try {
      const result = await getActiveRoles();
      if (result.success && result.data) {
        setAvailableRoles(result.data);
      }
    } catch (error) {
      console.error("ロール取得エラー:", error);
    }
  };

  // ロール一覧の取得
  useEffect(() => {
    loadRoles();
  }, []);

  // ユーザーコードの重複チェック
  const checkUserCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない

    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkUserCodeExists(code);
      if (result.exists && result.user) {
        const user = result.user;
        const status = user.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${user.userName} / ${status}）は既に使用されています。`
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

  // メールアドレスの重複チェック
  const checkEmail = async (email: string) => {
    if (!email) return;

    setEmailCheckLoading(true);
    setEmailCheckMessage("");
    setEmailCheckError(false);

    try {
      const result = await checkEmailExists(
        email,
        isEditing ? user?.userId : undefined
      );
      if (result.exists && result.user) {
        const user = result.user;
        const status = user.isActive ? "有効" : "無効";
        setEmailCheckMessage(
          `このメールアドレス（${user.userName} / ${status}）は既に使用されています。`
        );
        setEmailCheckError(true);
      } else {
        setEmailCheckMessage("このメールアドレスは使用可能です。");
        setEmailCheckError(false);
      }
    } catch {
      setEmailCheckMessage("メールアドレスのチェックに失敗しました。");
      setEmailCheckError(true);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && (codeCheckError || emailCheckError)) {
      showErrorToast(createSystemError("入力内容に問題があります", "登録処理"));
      return;
    }

    // 新規作成時にパスワードが未入力の場合はエラー
    if (!isEditing && (!data.password || data.password.length === 0)) {
      showErrorToast(createSystemError("パスワードは必須です", "登録処理"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && user) {
        // 更新
        console.log("=== ユーザ更新デバッグ情報 ===");
        console.log("user.userId:", user.userId);
        console.log("data:", data);
        const formData = new FormData();
        formData.append("userName", data.userName);
        if (data.userKana) formData.append("userKana", data.userKana);
        formData.append("email", data.email);
        formData.append("roleCode", data.roleCode);
        formData.append("isActive", data.isActive.toString());
        result = await updateUser(user.userId, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append("userCode", data.userCode);
        formData.append("userName", data.userName);
        if (data.userKana) formData.append("userKana", data.userKana);
        formData.append("email", data.email);
        formData.append("password", data.password || "");
        formData.append("confirmPassword", data.confirmPassword || "");
        formData.append("roleCode", data.roleCode);
        result = await createUser(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "ユーザを更新しました" : "ユーザを作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(
          result.error ||
            createSystemError("エラーが発生しました", "バリデーションエラー")
        );
      }
    } catch (error) {
      console.error("ユーザの保存エラー:", error);
      const systemError = createSystemError(
        "ユーザの保存に失敗しました",
        error instanceof Error ? error.message : "不明なエラー"
      );
      showErrorToast(systemError);
    } finally {
      setLoading(false);
    }
  };

  // Handle role selection from dialog
  const handleRoleSelect = (roleCode: string, roleName?: string) => {
    // 選択したロールコードをフォームに設定
    form.setValue("roleCode", roleCode);
    // 新規追加ロールの場合はローカル状態に追加
    if (roleName && !availableRoles.some((r) => r.roleCode === roleCode)) {
      setAvailableRoles((prev) => [...prev, { roleCode, roleName }]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="userCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザーコード *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: U001"
                  disabled={isEditing || loading}
                  onBlur={(e) => {
                    field.onBlur();
                    checkUserCode(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "コードは編集できません"
                  : codeCheckMessage && !codeCheckError
                  ? "" // チェック成功時は説明文を非表示
                  : "ユーザを識別するコードを入力してください"}
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
          name="userName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザー名 *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 山田太郎"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="userKana"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザー名（カナ）</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: ヤマダタロウ"
                  disabled={loading}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                カナ名を入力してください（省略可）
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="例: user@example.com"
                  disabled={loading}
                  onBlur={(e) => {
                    field.onBlur();
                    checkEmail(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                ログインに使用するメールアドレスを入力してください
              </FormDescription>

              {/* メールアドレス重複チェック結果の表示 */}
              {(emailCheckLoading || emailCheckMessage) && (
                <div
                  className={`text-sm mt-1 ${
                    emailCheckLoading
                      ? "text-gray-500"
                      : emailCheckError
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {emailCheckLoading ? "チェック中..." : emailCheckMessage}
                </div>
              )}

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roleCode"
          render={({ field }) => {
            const selectedRole = availableRoles.find(
              (role) => role.roleCode === field.value
            );
            return (
              <FormItem>
                <FormLabel>ロール *</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={
                          selectedRole
                            ? `${selectedRole.roleName} (${selectedRole.roleCode})`
                            : ""
                        }
                        placeholder="ロールを選択してください"
                        readOnly
                        className="cursor-pointer"
                        onClick={() => setShowRoleDialog(true)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowRoleDialog(true)}
                      disabled={loading}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  ユーザに付与するロールを選択してください
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* パスワード関連フィールド（新規作成時のみ表示） */}
        {!isEditing && (
          <>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="8文字以上のパスワードを入力"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    8文字以上の英数字記号を組み合わせてください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード確認</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="上記と同じパスワードを入力"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    確認のため、同じパスワードを再入力してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">有効</FormLabel>
                <FormDescription>
                  無効にするとログインできなくなります
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
            disabled={
              loading || (!isEditing && (codeCheckError || emailCheckError))
            }
          >
            {loading ? "保存中..." : isEditing ? "更新" : "作成"}
          </Button>
        </div>
      </form>

      {/* Role Selection Dialog */}
      <RoleSelectDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        onSelect={handleRoleSelect}
        selectedCode={form.watch("roleCode")}
      />
    </Form>
  );
}
