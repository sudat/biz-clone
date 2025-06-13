"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AnalysisCode } from "@/lib/database/prisma";
import { createAnalysisCode, updateAnalysisCode, getAnalysisTypes, checkAnalysisCodeExists, createAnalysisType } from "@/app/actions/analysis-codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const analysisCodeFormSchema = z.object({
  analysisCode: z
    .string()
    .min(1, "分析コードは必須です")
    .max(15, "分析コードは15文字以内で入力してください"),
  analysisName: z
    .string()
    .min(1, "分析名称は必須です")
    .max(100, "分析名称は100文字以内で入力してください"),
  analysisType: z
    .string()
    .min(1, "分析種別は必須です")
    .max(20, "分析種別は20文字以内で入力してください"),
  parentAnalysisCode: z
    .string()
    .max(15, "親分析コードは15文字以内で入力してください")
    .optional(),
  sortOrder: z
    .number()
    .int("表示順序は整数で入力してください")
    .min(0, "表示順序は0以上で入力してください")
    .optional(),
  isActive: z.boolean(),
});

type AnalysisCodeFormData = z.infer<typeof analysisCodeFormSchema>;

interface AnalysisCodeMasterFormProps {
  analysisCode?: AnalysisCode | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AnalysisCodeMasterForm({
  analysisCode,
  onSubmit,
  onCancel,
}: AnalysisCodeMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState<string>("");
  const [codeCheckError, setCodeCheckError] = useState<boolean>(false);
  const [analysisTypes, setAnalysisTypes] = useState<{typeCode: string, typeName: string}[]>([]);
  const [newAnalysisTypeCode, setNewAnalysisTypeCode] = useState("");
  const [newAnalysisTypeName, setNewAnalysisTypeName] = useState("");
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const isEditing = !!analysisCode;

  useEffect(() => {
    loadAnalysisTypes();
  }, []);

  const loadAnalysisTypes = async () => {
    try {
      const result = await getAnalysisTypes();
      if (result.success) {
        setAnalysisTypes(result.data || []);
      }
    } catch (error) {
      console.error("分析種別の取得エラー:", error);
    }
  };

  const form = useForm<AnalysisCodeFormData>({
    resolver: zodResolver(analysisCodeFormSchema),
    defaultValues: {
      analysisCode: analysisCode?.analysisCode || "",
      analysisName: analysisCode?.analysisName || "",
      analysisType: analysisCode?.analysisType || "",
      parentAnalysisCode: analysisCode?.parentAnalysisCode || "",
      sortOrder: analysisCode?.sortOrder || 1,
      isActive: analysisCode?.isActive ?? true,
    },
  });

  // 分析コードの重複チェック
  const checkAnalysisCode = async (code: string) => {
    if (!code || isEditing) return; // 編集時はチェックしない
    
    setCodeCheckLoading(true);
    setCodeCheckMessage("");
    setCodeCheckError(false);

    try {
      const result = await checkAnalysisCodeExists(code);
      if (result.exists && result.analysisCode) {
        const analysisCode = result.analysisCode;
        const status = analysisCode.isActive ? "有効" : "無効";
        setCodeCheckMessage(
          `このコード（${analysisCode.analysisName} / ${analysisCode.analysisType} / ${status}）は既に使用されています。`
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

  const handleSubmit = async (data: AnalysisCodeFormData) => {
    // 新規作成時に重複エラーがある場合は送信しない
    if (!isEditing && codeCheckError) {
      showErrorToast(createSystemError("分析コードが重複しています", "登録処理"));
      return;
    }
    setLoading(true);
    try {
      let result;
      if (isEditing && analysisCode) {
        // 更新
        const formData = new FormData();
        formData.append('analysisName', data.analysisName);
        formData.append('analysisType', data.analysisType);
        if (data.parentAnalysisCode) formData.append('parentAnalysisCode', data.parentAnalysisCode);
        if (data.sortOrder !== undefined) formData.append('sortOrder', data.sortOrder.toString());
        formData.append('isActive', data.isActive.toString());
        result = await updateAnalysisCode(analysisCode.analysisCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append('analysisCode', data.analysisCode);
        formData.append('analysisName', data.analysisName);
        formData.append('analysisType', data.analysisType);
        if (data.parentAnalysisCode) formData.append('parentAnalysisCode', data.parentAnalysisCode);
        if (data.sortOrder !== undefined) formData.append('sortOrder', data.sortOrder.toString());
        formData.append('isActive', data.isActive.toString());
        result = await createAnalysisCode(formData);
      }

      if (result.success) {
        showSuccessToast(
          isEditing ? "分析コードを更新しました" : "分析コードを作成しました"
        );
        onSubmit();
      } else {
        showErrorToast(createSystemError(result.error || "エラーが発生しました", "バリデーションエラー"));
      }
    } catch (error) {
      console.error("分析コードの保存エラー:", error);
      const systemError = createSystemError(
        "分析コードの保存に失敗しました",
        error instanceof Error ? error.message : "不明なエラー"
      );
      showErrorToast(systemError);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisTypeChange = (value: string) => {
    if (value === "new-type") {
      setIsAddingNewType(true);
      setNewAnalysisTypeCode("");
      setNewAnalysisTypeName("");
    } else {
      form.setValue("analysisType", value);
      setIsAddingNewType(false);
      setNewAnalysisTypeCode("");
      setNewAnalysisTypeName("");
    }
  };

  const handleNewAnalysisTypeSubmit = async () => {
    const typeCode = newAnalysisTypeCode.trim();
    const typeName = newAnalysisTypeName.trim();
    
    if (typeCode && typeName) {
      try {
        // コードフォーマットバリデーション
        if (!/^[a-zA-Z0-9_-]+$/.test(typeCode)) {
          showErrorToast(createSystemError("分析種別コードは英数字、アンダースコア、ハイフンのみ使用可能です", "入力エラー"));
          return;
        }

        // 分析種別マスタに保存
        const result = await createAnalysisType(typeCode, typeName);
        
        if (result.success) {
          // UIに反映
          form.setValue("analysisType", typeCode);
          setAnalysisTypes((prev) => [...prev, { typeCode, typeName }]);
          setNewAnalysisTypeCode("");
          setNewAnalysisTypeName("");
          setIsAddingNewType(false);
          showSuccessToast(`分析種別「${typeName}」を追加しました`);
        } else {
          showErrorToast(createSystemError(result.error || "分析種別の追加に失敗しました", "分析種別追加"));
        }
      } catch (error) {
        console.error("分析種別追加エラー:", error);
        showErrorToast(createSystemError("分析種別の追加に失敗しました", "ネットワークエラー"));
      }
    }
  };

  const handleNewAnalysisTypeCancel = () => {
    setNewAnalysisTypeCode("");
    setNewAnalysisTypeName("");
    setIsAddingNewType(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="analysisCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>分析コード</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例: DEPT001"
                    disabled={isEditing || loading}
                    onBlur={(e) => {
                      field.onBlur();
                      checkAnalysisCode(e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {isEditing
                    ? "コードは編集できません"
                    : codeCheckMessage && !codeCheckError
                      ? "" // チェック成功時は説明文を非表示
                      : "分析コードを識別するコードを入力してください"}
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
            name="analysisName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>分析名称</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例: 営業部"
                    disabled={loading}
                  />
                </FormControl>
                <FormDescription>
                  分析コードの名称を入力してください
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="analysisType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>分析種別</FormLabel>
                {isAddingNewType ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">分析種別コード *</Label>
                        <Input
                          value={newAnalysisTypeCode}
                          onChange={(e) => setNewAnalysisTypeCode(e.target.value)}
                          placeholder="例: cost_center"
                          disabled={loading}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">分析種別名 *</Label>
                        <Input
                          value={newAnalysisTypeName}
                          onChange={(e) => setNewAnalysisTypeName(e.target.value)}
                          placeholder="例: コストセンター"
                          disabled={loading}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleNewAnalysisTypeCancel}
                        disabled={loading}
                      >
                        キャンセル
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleNewAnalysisTypeSubmit}
                        disabled={loading || !newAnalysisTypeCode.trim() || !newAnalysisTypeName.trim()}
                      >
                        追加
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select
                    onValueChange={handleAnalysisTypeChange}
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="分析種別を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {analysisTypes.map((type) => (
                        <SelectItem key={type.typeCode} value={type.typeCode}>
                          {type.typeName}
                        </SelectItem>
                      ))}
                      <SelectItem value="new-type">
                        + 新しい種別を追加
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <FormDescription>
                  既存の分析種別から選択するか、新しい種別を追加してください
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
                <FormLabel>表示順序</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    placeholder="例: 1"
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseInt(value)
                      );
                    }}
                    disabled={loading}
                  />
                </FormControl>
                <FormDescription>
                  表示順序を数値で指定してください（省略可）
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
                  <FormLabel className="text-base">有効状態</FormLabel>
                  <FormDescription>
                    この分析コードを使用可能にするかどうか
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
        </div>

        <div className="flex gap-2 justify-end">
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
