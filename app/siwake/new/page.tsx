/**
 * 仕訳作成ページ
 * ============================================================================
 * 新規仕訳の作成を行うページ
 * ============================================================================
 */

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalEntryForm } from "@/components/accounting/journal-entry-form";
import { showSuccessToast, showErrorToast } from "@/components/ui/error-toast";
import { ErrorType } from "@/lib/types/errors";
import { saveJournal } from "@/app/actions/journal-save";
import { type JournalSaveData } from "@/types/journal";

export default function NewSiwakePage() {
  const router = useRouter();

  // 仕訳登録処理
  const handleSubmit = async (data: JournalSaveData) => {
    try {
      console.log("仕訳登録データ:", data);

      const result = await saveJournal(data);

      if (result.success) {
        showSuccessToast(
          "仕訳が正常に登録されました",
          `仕訳番号: ${result.journalNumber}`
        );

        // 一覧ページに戻る
        router.push("/siwake");
      } else {
        showErrorToast({
          type: ErrorType.VALIDATION,
          message: result.error || "仕訳の登録に失敗しました",
        });
      }
    } catch (error) {
      console.error("仕訳登録エラー:", error);
      showErrorToast({
        type: ErrorType.SYSTEM,
        message: "仕訳の登録に失敗しました",
        details: {
          originalError:
            error instanceof Error ? error.message : "不明なエラー",
          retryable: true,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/siwake">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">新規仕訳作成</h1>
      </div>

      {/* 仕訳作成フォーム */}
      <JournalEntryForm onSubmit={handleSubmit} />
    </div>
  );
}
