/**
 * 仕訳ヘッダーセクションコンポーネント
 * ============================================================================
 * 計上日、伝票摘要、仕訳番号表示を含むヘッダー部分
 * ============================================================================
 */

"use client";

import React from "react";
import { Control } from "react-hook-form";
import { Hash } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface JournalHeaderSectionProps {
  control?: Control<any>;
  journalNumber?: string;
  formData?: {
    header: {
      journalDate: string;
      description: string;
    };
  };
  readOnly?: boolean;
}

export function JournalHeaderSection({
  control,
  journalNumber,
  formData,
  readOnly = false,
}: JournalHeaderSectionProps) {
  return (
    <Card className="border-2 border-slate-200">
      <CardContent className="py-2">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {/* 計上日 */}
            <div className="flex items-center gap-2">
              {readOnly && formData ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">
                    計上日 *
                  </label>
                  <div className="font-mono text-center w-28 h-9 px-3 py-2 border border-input bg-background rounded-md text-sm">
                    {formData.header.journalDate}
                  </div>
                </div>
              ) : control ? (
                <FormField
                  control={control}
                  name="header.journalDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-sm font-medium whitespace-nowrap">
                          計上日 *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="YYYYMMDD"
                            maxLength={8}
                            value={field.value}
                            onChange={(e) => {
                              const input = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 8);
                              field.onChange(input);
                            }}
                            className="font-mono text-center w-28 h-9"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            {/* 伝票摘要 */}
            <div className="flex-1">
              {readOnly && formData ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">
                    伝票摘要
                  </label>
                  <div className="flex-1 h-9 px-3 py-2 border border-input bg-background rounded-md text-sm">
                    {formData.header.description || "―"}
                  </div>
                </div>
              ) : control ? (
                <FormField
                  control={control}
                  name="header.description"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-sm font-medium whitespace-nowrap">
                          伝票摘要
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="伝票の概要や詳細を入力してください（任意）"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            {/* 仕訳番号 - 右端に表示 */}
            {journalNumber && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-sm px-2 py-1"
              >
                <Hash className="h-3 w-3" />
                {journalNumber}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
