/**
 * 仕訳作成フォームコンポーネント
 * ============================================================================
 * React Hook Form + Zod + Shadcn/UI Formを使用した仕訳入力フォーム
 * モダンなレイアウト: 貸借を左右で表現、中央入力、下部明細一覧
 * ============================================================================
 */

"use client";

import React, { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Save, CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  journalEntrySchema,
  defaultJournalEntry,
  type JournalEntryInput,
} from "@/lib/schemas/journal";

// Props型定義
interface JournalEntryFormProps {
  onSubmit: (data: JournalEntryInput) => Promise<void>;
  onSaveDraft?: (data: JournalEntryInput) => Promise<void>;
  defaultValues?: Partial<JournalEntryInput>;
  isLoading?: boolean;
}

// 通貨フォーマット
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(amount);
};

export function JournalEntryForm({
  onSubmit,
  onSaveDraft,
  defaultValues,
  isLoading = false,
}: JournalEntryFormProps) {
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [currentEntry, setCurrentEntry] = useState({
    debitCredit: "debit" as "debit" | "credit",
    accountCode: "",
    subAccountCode: "",
    amount: 0,
    description: "",
  });

  // React Hook Form セットアップ
  const form = useForm<JournalEntryInput>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: defaultValues || defaultJournalEntry,
    mode: "onChange",
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = form;

  // 明細行の動的管理
  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  // フォーム値の監視
  const watchedDetails = watch("details");

  // 借方・貸方の合計計算
  const calculateTotals = useCallback(() => {
    const debitTotal =
      watchedDetails
        ?.filter((detail) => detail.debitCredit === "debit")
        .reduce((sum, detail) => sum + (Number(detail.amount) || 0), 0) || 0;

    const creditTotal =
      watchedDetails
        ?.filter((detail) => detail.debitCredit === "credit")
        .reduce((sum, detail) => sum + (Number(detail.amount) || 0), 0) || 0;

    return { debitTotal, creditTotal, difference: debitTotal - creditTotal };
  }, [watchedDetails]);

  const { debitTotal, creditTotal, difference } = calculateTotals();

  // 明細行追加
  const addCurrentEntry = () => {
    if (currentEntry.accountCode && currentEntry.amount > 0) {
      append(currentEntry);
      setCurrentEntry({
        debitCredit: currentEntry.debitCredit === "debit" ? "credit" : "debit",
        accountCode: "",
        subAccountCode: "",
        amount: 0,
        description: "",
      });
    }
  };

  // フォーム送信
  const handleFormSubmit = async (data: JournalEntryInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  // 下書き保存
  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;

    setIsDraftSaving(true);
    try {
      const formData = form.getValues();
      await onSaveDraft(formData);
    } catch (error) {
      console.error("Draft save error:", error);
    } finally {
      setIsDraftSaving(false);
    }
  };

  // 借方・貸方の明細を分離
  const debitEntries = fields.filter((field) => field.debitCredit === "debit");
  const creditEntries = fields.filter(
    (field) => field.debitCredit === "credit"
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* ヘッダー部分 */}
        <Card>
          <CardHeader>
            <CardTitle>仕訳ヘッダー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 仕訳日付 */}
              <FormField
                control={control}
                name="header.journalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仕訳日付 *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ja })
                            ) : (
                              <span>日付を選択</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 摘要 */}
              <FormField
                control={control}
                name="header.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>摘要</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="仕訳の概要を入力（任意）"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 貸借対照表示と入力エリア */}
        <div className="grid grid-cols-12 gap-6">
          {/* 借方エリア */}
          <div className="col-span-5">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  借方
                  <Badge variant="secondary" className="ml-auto">
                    {formatCurrency(debitTotal)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {debitEntries.map((entry, index) => (
                  <div
                    key={`debit-${index}`}
                    className="p-3 bg-blue-50 rounded-lg border"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{entry.accountCode}</div>
                        {entry.subAccountCode && (
                          <div className="text-sm text-muted-foreground">
                            {entry.subAccountCode}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {entry.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {formatCurrency(entry.amount)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            remove(fields.findIndex((f) => f === entry))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {debitEntries.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    借方の明細がありません
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 中央入力エリア */}
          <div className="col-span-2">
            <Card className="h-full">
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="space-y-4">
                  {/* 借方・貸方切り替え */}
                  <div className="flex justify-center">
                    <div className="flex bg-muted rounded-lg p-1">
                      <Button
                        type="button"
                        variant={
                          currentEntry.debitCredit === "debit"
                            ? "default"
                            : "ghost"
                        }
                        size="sm"
                        onClick={() =>
                          setCurrentEntry((prev) => ({
                            ...prev,
                            debitCredit: "debit",
                          }))
                        }
                      >
                        借方
                      </Button>
                      <Button
                        type="button"
                        variant={
                          currentEntry.debitCredit === "credit"
                            ? "default"
                            : "ghost"
                        }
                        size="sm"
                        onClick={() =>
                          setCurrentEntry((prev) => ({
                            ...prev,
                            debitCredit: "credit",
                          }))
                        }
                      >
                        貸方
                      </Button>
                    </div>
                  </div>

                  {/* 勘定科目 */}
                  <div className="space-y-2">
                    <Input
                      placeholder="勘定科目"
                      value={currentEntry.accountCode}
                      onChange={(e) =>
                        setCurrentEntry((prev) => ({
                          ...prev,
                          accountCode: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="補助科目（任意）"
                      value={currentEntry.subAccountCode}
                      onChange={(e) =>
                        setCurrentEntry((prev) => ({
                          ...prev,
                          subAccountCode: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* 金額 */}
                  <Input
                    type="number"
                    placeholder="金額"
                    value={currentEntry.amount}
                    onChange={(e) =>
                      setCurrentEntry((prev) => ({
                        ...prev,
                        amount: Number(e.target.value) || 0,
                      }))
                    }
                  />

                  {/* 摘要 */}
                  <Input
                    placeholder="摘要"
                    value={currentEntry.description}
                    onChange={(e) =>
                      setCurrentEntry((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />

                  {/* 追加ボタン */}
                  <Button
                    type="button"
                    onClick={addCurrentEntry}
                    disabled={
                      !currentEntry.accountCode || currentEntry.amount <= 0
                    }
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    明細追加
                  </Button>

                  {/* バランス表示 */}
                  <div className="text-center">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        Math.abs(difference) < 0.01
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      差額: {formatCurrency(Math.abs(difference))}
                    </div>
                    {Math.abs(difference) < 0.01 && (
                      <Badge variant="default" className="mt-1">
                        バランス
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 貸方エリア */}
          <div className="col-span-5">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  貸方
                  <Badge variant="secondary" className="ml-auto">
                    {formatCurrency(creditTotal)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creditEntries.map((entry, index) => (
                  <div
                    key={`credit-${index}`}
                    className="p-3 bg-green-50 rounded-lg border"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{entry.accountCode}</div>
                        {entry.subAccountCode && (
                          <div className="text-sm text-muted-foreground">
                            {entry.subAccountCode}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {entry.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {formatCurrency(entry.amount)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            remove(fields.findIndex((f) => f === entry))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {creditEntries.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    貸方の明細がありません
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 明細一覧（下部） */}
        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>仕訳明細一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>借方/貸方</TableHead>
                    <TableHead>勘定科目</TableHead>
                    <TableHead>補助科目</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>摘要</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Badge
                          variant={
                            field.debitCredit === "debit"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {field.debitCredit === "debit" ? "借方" : "貸方"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {field.accountCode}
                      </TableCell>
                      <TableCell>{field.subAccountCode || "-"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(field.amount)}
                      </TableCell>
                      <TableCell>{field.description || "-"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* アクションボタン */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {fields.length === 0 && <span>明細を追加してください</span>}
            {fields.length > 0 && Math.abs(difference) >= 0.01 && (
              <span className="text-red-600">
                借方と貸方の金額が一致していません
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isDraftSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isDraftSaving ? "保存中..." : "下書き保存"}
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                !isValid ||
                isLoading ||
                fields.length === 0 ||
                Math.abs(difference) >= 0.01
              }
            >
              <Calculator className="h-4 w-4 mr-2" />
              {isLoading ? "登録中..." : "仕訳登録"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
