/**
 * 仕訳作成ページ
 * ============================================================================
 * 新規仕訳の作成を行うページ
 * ============================================================================
 */

"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JournalEntryForm } from '@/components/accounting/journal-entry-form';
import { showSuccessToast, showErrorToast } from '@/components/ui/error-toast';
import { ErrorType } from '@/lib/types/errors';
import type { JournalEntryInput } from '@/lib/schemas/journal';

export default function NewSiwakePage() {
  const router = useRouter();

  // 仕訳登録処理
  const handleSubmit = async (data: JournalEntryInput) => {
    try {
      console.log('仕訳登録データ:', data);
      
      // TODO: Server Actionによる仕訳登録処理を実装
      // const result = await createJournalEntryAction(data);
      
      // 仮の成功処理
      showSuccessToast(
        '仕訳が正常に登録されました',
        `仕訳日付: ${data.header.journalDate.toLocaleDateString('ja-JP')}`
      );
      
      // 一覧ページに戻る
      router.push('/siwake');
      
    } catch (error) {
      console.error('仕訳登録エラー:', error);
      showErrorToast({
        type: ErrorType.SYSTEM,
        message: '仕訳の登録に失敗しました',
        details: {
          originalError: error instanceof Error ? error.message : '不明なエラー',
          retryable: true,
        },
      });
    }
  };

  // 下書き保存処理
  const handleSaveDraft = async (data: JournalEntryInput) => {
    try {
      console.log('下書き保存データ:', data);
      
      // TODO: ローカルストレージまたはサーバーへの下書き保存
      localStorage.setItem('journal-draft', JSON.stringify(data));
      
      showSuccessToast('下書きが保存されました');
      
    } catch (error) {
      console.error('下書き保存エラー:', error);
      showErrorToast({
        type: ErrorType.SYSTEM,
        message: '下書きの保存に失敗しました',
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新規仕訳作成</h1>
          <p className="text-muted-foreground">
            複式簿記による仕訳を作成します
          </p>
        </div>
      </div>

      {/* 仕訳作成フォーム */}
      <JournalEntryForm
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}