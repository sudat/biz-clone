"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AnalysisCode } from "@/lib/database/prisma";
import { createAnalysisCode, updateAnalysisCode, getAnalysisTypes } from "@/app/actions/analysis-codes";
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
  const [analysisTypes, setAnalysisTypes] = useState<string[]>([]);
  const [newAnalysisType, setNewAnalysisType] = useState("");
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

  const handleSubmit = async (data: AnalysisCodeFormData) => {
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
        onSubmit();
      } else {
        alert("保存エラー: " + result.error);
      }
    } catch (error) {
      console.error("分析コードの保存エラー:", error);
      alert("保存に失敗しました: " + error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisTypeChange = (value: string) => {
    if (value === "new-type") {
      setNewAnalysisType("");
    } else {
      form.setValue("analysisType", value);
      setNewAnalysisType("");
    }
  };

  const handleNewAnalysisTypeSubmit = () => {
    if (newAnalysisType.trim()) {
      form.setValue("analysisType", newAnalysisType.trim());
      setAnalysisTypes((prev) => [...prev, newAnalysisType.trim()]);
      setNewAnalysisType("");
    }
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
                  />
                </FormControl>
                <FormDescription>
                  {isEditing
                    ? "コードは編集できません"
                    : "分析コードを識別するコードを入力してください"}
                </FormDescription>
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
                {newAnalysisType !== "" ? (
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        value={newAnalysisType}
                        onChange={(e) => setNewAnalysisType(e.target.value)}
                        placeholder="新しい分析種別を入力"
                        disabled={loading}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNewAnalysisTypeSubmit}
                      disabled={loading || !newAnalysisType.trim()}
                    >
                      追加
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewAnalysisType("")}
                      disabled={loading}
                    >
                      キャンセル
                    </Button>
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
                        <SelectItem key={type} value={type}>
                          {type}
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
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : isEditing ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
