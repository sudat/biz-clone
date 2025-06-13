/**
 * 仕訳更新ページ
 * ============================================================================
 * 既存仕訳の編集・更新機能
 * ============================================================================
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { JournalEntryForm } from "@/components/accounting/journal-entry-form";
import { getJournalByNumber } from "@/app/actions/journal-inquiry";
import { updateJournal } from "@/app/actions/journal-save";
import { JournalSaveData, JournalDetailData } from "@/types/journal";
import type {
  JournalInquiryData,
  JournalDetailInquiryData,
} from "@/app/actions/journal-inquiry";
import Link from "next/link";

interface UpdatePageProps {
  params: Promise<{ journalNumber: string }>;
}

export default function JournalUpdatePage({ params }: UpdatePageProps) {
  const router = useRouter();
  const [journalNumber, setJournalNumber] = useState<string>("");
  const [journalData, setJournalData] = useState<JournalInquiryData | null>(
    null
  );
  const [initialFormData, setInitialFormData] = useState<{
    header: {
      journalDate: string;
      description: string;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 仕訳データをJournalDetailDataに変換
  const convertToJournalDetailData = (
    detail: JournalDetailInquiryData
  ): JournalDetailData => {
    return {
      debitCredit: detail.debitCredit === "D" ? "debit" : "credit",
      accountCode: detail.accountCode,
      accountName: detail.accountName,
      subAccountCode: detail.subAccountCode || undefined,
      subAccountName: detail.subAccountName || undefined,
      partnerCode: detail.partnerCode || undefined,
      partnerName: detail.partnerName || undefined,
      analysisCode: detail.analysisCode || undefined,
      analysisCodeName: detail.analysisCodeName || undefined,
      baseAmount: detail.baseAmount,
      taxAmount: detail.taxAmount,
      totalAmount: detail.totalAmount,
      taxRate: detail.taxRate || undefined,
      taxType: detail.taxType as
        | "taxable"
        | "non_taxable"
        | "tax_free"
        | "tax_entry",
      description: detail.lineDescription || undefined,
    };
  };

  // 初期データ取得
  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedParams = await params;
        setJournalNumber(resolvedParams.journalNumber);

        const result = await getJournalByNumber(resolvedParams.journalNumber);
        if (!result.success || !result.data) {
          setError(result.error || "仕訳データの取得に失敗しました");
          return;
        }

        setJournalData(result.data);

        // フォーム用の初期データを作成
        const formData = {
          header: {
            journalDate: result.data.journalDate
              .toLocaleDateString("ja-JP")
              .replace(/\//g, "")
              .replace(/^(\d{4})(\d{2})(\d{2})$/, "$1$2$3"),
            description: result.data.description || "",
          },
        };

        setInitialFormData(formData);
      } catch (err) {
        console.error("データ取得エラー:", err);
        setError("仕訳データの取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params]);

  // 更新処理
  const handleUpdate = async (data: JournalSaveData) => {
    if (!journalNumber) return;

    setIsSaving(true);
    try {
      const result = await updateJournal(journalNumber, data);

      if (result.success) {
        // 更新成功 - 照会ページに遷移
        router.push(`/siwake/${journalNumber}`);
        router.refresh();
      } else {
        throw new Error(result.error || "更新に失敗しました");
      }
    } catch (err) {
      console.error("更新エラー:", err);
      alert(
        err instanceof Error ? err.message : "更新中にエラーが発生しました"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">仕訳データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !journalData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error || "仕訳データが見つかりません"}</p>
            <Button onClick={() => router.push("/siwake")} variant="outline">
              仕訳一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/siwake">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">仕訳更新</h1>
      </div>

      {/* 更新フォーム */}
      <JournalEntryForm
        onSubmit={handleUpdate}
        initialData={initialFormData || undefined}
        journalNumber={journalNumber}
        disabled={isSaving}
        // 初期明細を設定
        initialDetails={journalData.details.map(convertToJournalDetailData)}
      />
    </div>
  );
}
