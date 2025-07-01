/**
 * テスト仕訳データ生成UIコンポーネント
 * ============================================================================
 * 勘定照合マスタに基づくテスト仕訳ペアの生成用インターフェース
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  generateTestJournals,
  checkTestJournalGenerationAvailability,
  getReconciliationMappingsForTesting,
  type TestJournalGeneratorParams,
  type TestJournalGeneratorResult,
} from "@/app/actions/test-journal-generator";

// フォームスキーマ
const testJournalGeneratorSchema = z.object({
  fromDate: z.date({
    required_error: "開始日を選択してください",
  }),
  toDate: z.date({
    required_error: "終了日を選択してください",
  }),
  journalCount: z
    .number({
      required_error: "作成件数を入力してください",
    })
    .min(1, "作成件数は1以上である必要があります")
    .max(100, "作成件数は100以下である必要があります"),
}).refine((data) => data.fromDate <= data.toDate, {
  message: "開始日は終了日以前である必要があります",
  path: ["fromDate"],
});

type TestJournalGeneratorForm = z.infer<typeof testJournalGeneratorSchema>;

interface TestJournalGeneratorProps {
  className?: string;
}

export function TestJournalGenerator({ className }: TestJournalGeneratorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    success: boolean;
    mappingCount?: number;
    availablePatterns?: number;
    error?: string;
  } | null>(null);
  const [mappingData, setMappingData] = useState<any[]>([]);
  const [generationResult, setGenerationResult] = useState<TestJournalGeneratorResult | null>(null);

  const form = useForm<TestJournalGeneratorForm>({
    resolver: zodResolver(testJournalGeneratorSchema),
    defaultValues: {
      fromDate: new Date(),
      toDate: new Date(),
      journalCount: 10,
    },
  });

  // 初期チェック実行
  useEffect(() => {
    handlePreCheck();
  }, []);

  // 事前チェック処理
  const handlePreCheck = async () => {
    setIsChecking(true);
    try {
      const [availabilityResult, mappingsResult] = await Promise.all([
        checkTestJournalGenerationAvailability(),
        getReconciliationMappingsForTesting(),
      ]);

      setCheckResult(availabilityResult);
      if (mappingsResult.success) {
        setMappingData(mappingsResult.data || []);
      }
    } catch (error) {
      console.error("事前チェックエラー:", error);
      setCheckResult({
        success: false,
        error: "チェックに失敗しました",
      });
    } finally {
      setIsChecking(false);
    }
  };

  // フォーム送信処理
  const onSubmit = async (data: TestJournalGeneratorForm) => {
    setIsSubmitting(true);
    setGenerationResult(null);

    try {
      const params: TestJournalGeneratorParams = {
        fromDate: format(data.fromDate, "yyyy-MM-dd"),
        toDate: format(data.toDate, "yyyy-MM-dd"),
        journalCount: data.journalCount,
      };

      const result = await generateTestJournals(params);
      setGenerationResult(result);

      if (result.success) {
        // 成功した場合は件数をリセット
        form.setValue("journalCount", 10);
      }
    } catch (error) {
      console.error("テスト仕訳生成エラー:", error);
      setGenerationResult({
        success: false,
        error: "予期しないエラーが発生しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // フォームリセット処理
  const handleReset = () => {
    form.reset();
    setGenerationResult(null);
  };

  // 実行可能状態の判定
  const canExecute = checkResult?.success && !isSubmitting && !isChecking;

  return (
    <div className={cn("space-y-6", className)}>
      {/* 事前チェック結果 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isChecking ? (
                  <RotateCcw className="h-5 w-5 animate-spin" />
                ) : checkResult?.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                システム状態チェック
              </CardTitle>
              <CardDescription>
                テスト仕訳生成に必要な設定の確認結果
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreCheck}
              disabled={isChecking}
            >
              {isChecking ? "チェック中..." : "再チェック"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isChecking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCcw className="h-4 w-4 animate-spin" />
              システム状態を確認しています...
            </div>
          ) : checkResult?.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  勘定照合マスタ: {checkResult.mappingCount}件
                </Badge>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  取引パターン: {checkResult.availablePatterns}種類
                </Badge>
              </div>
              <div className="text-sm text-green-600">
                ✓ テスト仕訳の生成が可能です
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>生成不可</AlertTitle>
              <AlertDescription>
                {checkResult?.error || "システム状態の確認に失敗しました"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 生成設定フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>テスト仕訳生成設定</CardTitle>
          <CardDescription>
            指定した期間と件数でテスト仕訳ペアを生成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 開始日 */}
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>開始日</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "yyyy年MM月dd日", { locale: ja })
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
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        テスト仕訳の開始日を選択してください
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 終了日 */}
                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>終了日</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "yyyy年MM月dd日", { locale: ja })
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
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        テスト仕訳の終了日を選択してください
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 作成件数 */}
              <FormField
                control={form.control}
                name="journalCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>作成件数</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="w-full md:w-48"
                      />
                    </FormControl>
                    <FormDescription>
                      1〜100件の範囲で指定してください（1件につき借方・貸方ペアが作成されます）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* アクションボタン */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={!canExecute}
                  className="min-w-32"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    "実行"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  リセット
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 勘定照合マスタ一覧 */}
      {mappingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>使用される勘定照合マスタ</CardTitle>
            <CardDescription>
              テスト仕訳生成に使用される勘定照合マスタの一覧
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mappingData.slice(0, 5).map((mapping, index) => (
                <div
                  key={mapping.mappingId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {mapping.departmentCode} → {mapping.counterDepartmentCode}
                    </div>
                    <div className="text-muted-foreground">
                      {mapping.accountCode}({mapping.accountName || "未設定"}) ⇄ {mapping.counterAccountCode}({mapping.counterAccountName || "未設定"})
                    </div>
                  </div>
                </div>
              ))}
              {mappingData.length > 5 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  他 {mappingData.length - 5} 件
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 生成結果 */}
      {generationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {generationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              生成結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generationResult.success ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>生成完了</AlertTitle>
                  <AlertDescription>
                    {generationResult.createdJournals?.length || 0}件のテスト仕訳を作成しました
                  </AlertDescription>
                </Alert>

                {generationResult.createdJournals && generationResult.createdJournals.length > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="font-medium">作成された仕訳概要</h4>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                      {generationResult.createdJournals.slice(0, 10).map((journal, index) => (
                        <div
                          key={journal.journalNumber}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <div className="space-y-1">
                            <div className="font-mono text-xs text-blue-600">
                              {journal.journalNumber}
                            </div>
                            <div className="text-muted-foreground">
                              {journal.description}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              ¥{journal.totalAmount.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {journal.journalDate}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(generationResult.createdJournals?.length || 0) > 10 && (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          他 {(generationResult.createdJournals?.length || 0) - 10} 件
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>生成エラー</AlertTitle>
                <AlertDescription>
                  {generationResult.error || "予期しないエラーが発生しました"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}