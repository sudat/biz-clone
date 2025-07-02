# 勘定照合レポート MCP 機能実装タスク

## 作業概要

ClaudeWeb から「X 月の勘定照合結果を教えて」という問い合わせに対して、勘定照合のサマリ・明細レポートを返す MCP 機能を実装する。

## アーキテクチャ

- `app/actions/reconciliation-report.ts` の既存ロジックを活用
- `remote-mcp-server/lib/database/reconciliation-report.ts` に移植・適応
- `remote-mcp-server/src/index.ts` で MCP ツールとして公開

## 作業タスク

### 1. 調査・分析

- [x] プロジェクト構造の調査
- [x] 既存 MCP ツール実装パターンの確認
- [x] 勘定照合レポート機能の仕様確認

### 2. 実装準備

- [x] `remote-mcp-server/lib/database/reconciliation-report.ts` の作成
- [x] 必要な型定義の移植
- [x] Prisma クライアント対応の確認

### 3. コア実装

- [x] `getReconciliationSummary` 関数の実装
  - [ ] 指定期間の勘定照合パターンを集計
  - [ ] 一致/不一致のカウントと金額集計
  - [ ] わかりやすいサマリ形式で返却
- [x] `getReconciliationDetail` 関数の実装
  - [ ] 特定の勘定照合組み合わせの明細取得
  - [ ] 仕訳番号、日付、金額などの詳細情報
  - [ ] ページネーション対応

### 4. MCP ツール統合

- [x] `remote-mcp-server/src/index.ts` への統合
  - [x] `get_reconciliation_summary` ツールの追加
  - [x] `get_reconciliation_detail` ツールの追加
  - [x] エラーハンドリングの実装

### 5. テスト・検証

- [x] 構文エラーの修正
- [x] TypeScript 型チェック通過
- [ ] サマリレポートの動作確認
  - [ ] 「1 月の勘定照合結果を教えて」への応答
  - [ ] 正しい一致/不一致カウント
- [ ] 明細レポートの動作確認
  - [ ] 「不一致パターンの明細を教えて」への応答
  - [ ] 仕訳詳細の正確な表示
- [ ] エラーケースのテスト
  - [ ] データが存在しない期間
  - [ ] 無効なパラメータ

### 6. ドキュメント・仕上げ

- [ ] MCP ツールの使用方法ドキュメント追加
- [ ] コードのコメント・整理
- [ ] 既存機能への影響確認

## 注意事項

- 既存の MCP ツールを壊さないよう慎重に実装
- エラーハンドリングを適切に実装
- レスポンスは JSON 形式で構造化
- 日本語と英語の両方に対応
