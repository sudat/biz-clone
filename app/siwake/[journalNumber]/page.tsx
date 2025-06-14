/**
 * 仕訳照会ページ
 * ============================================================================
 * 特定の仕訳番号の詳細を表示・編集・削除する画面
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JournalInquiryForm } from "@/components/accounting/journal-inquiry-form";
import {
  getJournalByNumber,
  deleteJournalFromInquiry,
} from "@/app/actions/journal-inquiry";
import type { JournalInquiryData } from "@/app/actions/journal-inquiry";
import { showSuccessToast, showErrorToast } from "@/components/ui/error-toast";
import { ErrorType } from "@/lib/types/errors";

export default function JournalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const journalNumber = params.journalNumber as string;

  const [journalData, setJournalData] = useState<JournalInquiryData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 仕訳データを取得
  useEffect(() => {
    const fetchJournalData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getJournalByNumber(journalNumber);

        if (result.success && result.data) {
          setJournalData(result.data);
        } else {
          setError(result.error || "仕訳データの取得に失敗しました");
        }
      } catch (error) {
        console.error("仕訳データ取得エラー:", error);
        setError("仕訳データの取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (journalNumber) {
      fetchJournalData();
    }
  }, [journalNumber]);

  // 更新処理
  const handleUpdate = () => {
    router.push(`/siwake/update/${journalNumber}`);
  };

  // 削除処理
  const handleDelete = async () => {
    try {
      const result = await deleteJournalFromInquiry(journalNumber);

      if (result.success) {
        showSuccessToast("仕訳が削除されました", `仕訳番号: ${journalNumber}`);
        router.push("/siwake");
      } else {
        showErrorToast({
          type: ErrorType.VALIDATION,
          message: result.error || "仕訳の削除に失敗しました",
        });
      }
    } catch (error) {
      console.error("削除エラー:", error);
      showErrorToast({
        type: ErrorType.SYSTEM,
        message: "仕訳の削除中にエラーが発生しました",
        details: {
          originalError:
            error instanceof Error ? error.message : "不明なエラー",
          retryable: true,
        },
      });
    }
  };

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/siwake">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              一覧に戻る
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">仕訳照会</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error || !journalData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/siwake">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              一覧に戻る
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">仕訳照会</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-lg font-medium text-destructive mb-2">
              エラーが発生しました
            </div>
            <div className="text-muted-foreground mb-4">
              {error || "仕訳データが見つかりません"}
            </div>
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/siwake">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">仕訳照会</h1>
      </div>

      {/* 仕訳照会フォーム */}
      <JournalInquiryForm
        journalData={journalData}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
