"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Database } from "@/lib/database/types";
import { PartnerDataAdapter } from "@/lib/adapters/client-data-adapter";
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

type Partner = Database["public"]["Tables"]["partners"]["Row"];

const partnerFormSchema = z.object({
  partner_code: z
    .string()
    .min(1, "取引先コードは必須です")
    .max(15, "取引先コードは15文字以内で入力してください"),
  partner_name: z
    .string()
    .min(1, "取引先名称は必須です")
    .max(100, "取引先名称は100文字以内で入力してください"),
  partner_kana: z
    .string()
    .max(100, "取引先かなは100文字以内で入力してください")
    .optional(),
  partner_type: z.enum(["得意先", "仕入先", "金融機関", "その他"], {
    required_error: "取引先種別を選択してください",
  }),
  postal_code: z
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
  contact_person: z
    .string()
    .max(50, "担当者名は50文字以内で入力してください")
    .optional(),
  is_active: z.boolean(),
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
      partner_code: partner?.partner_code || "",
      partner_name: partner?.partner_name || "",
      partner_kana: partner?.partner_kana || "",
      partner_type: partner?.partner_type || "得意先",
      postal_code: partner?.postal_code || "",
      address: partner?.address || "",
      phone: partner?.phone || "",
      email: partner?.email || "",
      contact_person: partner?.contact_person || "",
      is_active: partner?.is_active ?? true,
    },
  });

  const handleSubmit = async (data: PartnerFormData) => {
    setLoading(true);
    try {
      let result;
      if (isEditing && partner) {
        // 更新
        const updateData: Database["public"]["Tables"]["partners"]["Update"] = {
          partner_name: data.partner_name,
          partner_kana: data.partner_kana || null,
          partner_type: data.partner_type,
          postal_code: data.postal_code || null,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          contact_person: data.contact_person || null,
          is_active: data.is_active,
        };
        result = await PartnerDataAdapter.updatePartner(
          partner.partner_code,
          updateData
        );
      } else {
        // 新規作成
        const insertData: Database["public"]["Tables"]["partners"]["Insert"] = {
          partner_code: data.partner_code,
          partner_name: data.partner_name,
          partner_kana: data.partner_kana || null,
          partner_type: data.partner_type,
          postal_code: data.postal_code || null,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          contact_person: data.contact_person || null,
          is_active: data.is_active,
        };
        result = await PartnerDataAdapter.createPartner(insertData);
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
            name="partner_code"
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
            name="partner_type"
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
          name="partner_name"
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
          name="partner_kana"
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
            name="postal_code"
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
            name="contact_person"
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
          name="is_active"
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
