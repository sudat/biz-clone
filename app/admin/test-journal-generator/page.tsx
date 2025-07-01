/**
 * テスト仕訳データ生成ページ
 * ============================================================================
 * 管理者用のテスト仕訳データ生成インターフェース
 * ============================================================================
 */

import { TestJournalGenerator } from "@/components/accounting/test-journal-generator";

export default function TestJournalGeneratorPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ページヘッダー */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">テスト仕訳データ生成</h1>
        <p className="text-lg text-muted-foreground">
          勘定照合マスタに基づいて本支店間仕訳のテストデータを生成します
        </p>
      </div>

      {/* 注意事項 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-medium text-amber-800 mb-2">ご注意</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• この機能は開発・テスト用途でのみ使用してください</li>
          <li>• 生成されたデータは本番環境での使用には適していません</li>
          <li>• 勘定照合マスタが設定されていない場合は実行できません</li>
          <li>• 生成される仕訳は本支店間の相殺仕訳ペアとなります</li>
        </ul>
      </div>

      {/* テスト仕訳生成コンポーネント */}
      <TestJournalGenerator />
    </div>
  );
}

export const metadata = {
  title: "テスト仕訳データ生成 | Biz Clone",
  description: "勘定照合マスタに基づくテスト仕訳データの生成",
};