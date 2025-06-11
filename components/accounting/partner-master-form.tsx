"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Partner } from "@/lib/database/prisma";
import { createPartner, updatePartner } from "@/app/actions/partners";
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

const partnerFormSchema = z.object({
  partnerCode: z
    .string()
    .min(1, "取引先コードは必須です")
    .max(15, "取引先コードは15文字以内で入力してください"),
  partnerName: z
    .string()
    .min(1, "取引先名称は必須です")
    .max(100, "取引先名称は100文字以内で入力してください"),
  partnerKana: z
    .string()
    .max(100, "取引先かなは100文字以内で入力してください")
    .optional(),
  partnerType: z.enum(["得意先", "仕入先", "金融機関", "その他"], {
    required_error: "取引先種別を選択してください",
  }),
  postalCode: z
    .string()
    .max(8, "郵便番号は8文字以内で入力してください")
    .optional(),
  address: z
    .string()
    .max(200, "住所は200文字以内で入力してください")
    .optional(),
  phone: z
    .string()
    .max(20, "電話番号は20文字以内で入力してください")
    .optional(),
  email: z
    .string()
    .email("正しいメールアドレスを入力してください")
    .max(100, "メールアドレスは100文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  contactPerson: z
    .string()
    .max(50, "担当者名は50文字以内で入力してください")
    .optional(),
  isActive: z.boolean(),
});

type PartnerFormData = z.infer<typeof partnerFormSchema>;

interface PartnerMasterFormProps {
  partner?: Partner | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PartnerMasterForm({
  partner,
  onSubmit,
  onCancel,
}: PartnerMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!partner;

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      partnerCode: partner?.partnerCode || "",
      partnerName: partner?.partnerName || "",
      partnerKana: partner?.partnerKana || "",
      partnerType:
        (partner?.partnerType as "得意先" | "仕入先" | "金融機関" | "その他") ||
        "得意先",
      postalCode: partner?.postalCode || "",
      address: partner?.address || "",
      phone: partner?.phone || "",
      email: partner?.email || "",
      contactPerson: partner?.contactPerson || "",
      isActive: partner?.isActive ?? true,
    },
  });

  const handleSubmit = async (data: PartnerFormData) => {
    setLoading(true);
    try {
      let result;
      if (isEditing && partner) {
        // 更新
        const formData = new FormData();
        formData.append("partnerName", data.partnerName);
        if (data.partnerKana) formData.append("partnerKana", data.partnerKana);
        formData.append("partnerType", data.partnerType);
        if (data.postalCode) formData.append("postalCode", data.postalCode);
        if (data.address) formData.append("address", data.address);
        if (data.phone) formData.append("phone", data.phone);
        if (data.email) formData.append("email", data.email);
        if (data.contactPerson)
          formData.append("contactPerson", data.contactPerson);
        formData.append("isActive", data.isActive.toString());
        result = await updatePartner(partner.partnerCode, formData);
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append("partnerCode", data.partnerCode);
        formData.append("partnerName", data.partnerName);
        if (data.partnerKana) formData.append("partnerKana", data.partnerKana);
        formData.append("partnerType", data.partnerType);
        if (data.postalCode) formData.append("postalCode", data.postalCode);
        if (data.address) formData.append("address", data.address);
        if (data.phone) formData.append("phone", data.phone);
        if (data.email) formData.append("email", data.email);
        if (data.contactPerson)
          formData.append("contactPerson", data.contactPerson);
        formData.append("isActive", data.isActive.toString());
        result = await createPartner(formData);
      }

      if (result.success) {
        onSubmit();
      } else {
        alert("保存エラー: " + result.error);
      }
    } catch (error) {
      console.error("取引先の保存エラー:", error);
      alert("保存に失敗しました: " + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="partnerCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>取引先コード</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例: P001"
                    disabled={isEditing || loading}
                  />
                </FormControl>
                <FormDescription>
                  {isEditing
                    ? "コードは編集できません"
                    : "取引先を識別するコードを入力してください"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="partnerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>取引先種別</FormLabel>
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
                    <SelectItem value="得意先">得意先</SelectItem>
                    <SelectItem value="仕入先">仕入先</SelectItem>
                    <SelectItem value="金融機関">金融機関</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="partnerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>取引先名称</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 株式会社○○商事"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="partnerKana"
          render={({ field }) => (
            <FormItem>
              <FormLabel>取引先かな</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: かぶしきがいしゃまるまるしょうじ"
                  disabled={loading}
                />
              </FormControl>
              <FormDescription>
                検索用のかな表記を入力してください（任意）
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>郵便番号</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例: 123-4567"
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>電話番号</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例: 03-1234-5678"
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>住所</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例: 東京都千代田区○○1-2-3"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例: info@example.com"
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>担当者名</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例: 田中太郎"
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">有効状態</FormLabel>
                <FormDescription>
                  取引先を有効にするかどうかを設定します
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
