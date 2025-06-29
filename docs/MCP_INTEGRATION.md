# Claude Web 版 MCP 連携ガイド

## 概要

このドキュメントでは、biz-clone アプリケーションと Claude Web 版の MCP（Model Context Protocol）連携について説明します。

## エンドポイント

### 1. MCP JSON-RPC エンドポイント

- **URL**: `https://biz-clone.vercel.app/api`
- **プロトコル**: JSON-RPC 2.0
- **メソッド**: POST

### 2. SSE (Server-Sent Events) エンドポイント

- **URL**: `https://biz-clone.vercel.app/api/sse`
- **プロトコル**: Server-Sent Events
- **メソッド**: GET

## Claude Web 版での設定方法

1. Claude Web 版にログイン
2. インテグレーション設定に移動
3. MCP 設定で以下の URL を追加：
   ```
   https://biz-clone.vercel.app/api
   ```

## サポートされている MCP メソッド

### initialize

初期化とケイパビリティ交換

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {},
  "id": 1
}
```

### list_tools

利用可能なツール一覧

```json
{
  "jsonrpc": "2.0",
  "method": "list_tools",
  "params": {},
  "id": 2
}
```

### call_tool

ツールの実行

```json
{
  "jsonrpc": "2.0",
  "method": "call_tool",
  "params": {
    "name": "search_journals",
    "arguments": {
      "searchTerm": "売上"
    }
  },
  "id": 3
}
```

## 利用可能なツール

### save_journal

新しい仕訳を保存

- 必須パラメータ: header (journalDate), details (配列)

### search_journals

仕訳を検索

- オプションパラメータ: searchTerm, fromDate, toDate, page, limit

## SSE イベント

SSE エンドポイントは、仕訳の保存や更新時にリアルタイムでイベントを配信します。

### 接続方法

```javascript
const eventSource = new EventSource("https://biz-clone.vercel.app/api/sse");
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received event:", data);
};
```

## デバッグとログ確認

### ローカルでのテスト

```bash
# MCPエンドポイントのテスト
npm run test:mcp
```

### デバッグ用エンドポイント

1. **ヘルスチェック**

   - GET: `https://biz-clone.vercel.app/api`
   - MCP エンドポイントの動作状態を確認

2. **テスト用エンドポイント**
   - GET/POST: `https://biz-clone.vercel.app/api/mcp/test`
   - 接続テスト用

### Vercel でのログ確認

1. Vercel ダッシュボードにログイン
2. プロジェクトの「Functions」タブに移動
3. 「Logs」セクションでリアルタイムログを確認

### ログに含まれる情報

- **リクエストログ**:

  - タイムスタンプ
  - HTTP メソッド
  - パス
  - ヘッダー情報
  - リクエストボディ

- **レスポンスログ**:

  - ステータスコード
  - レスポンスボディ

- **エラーログ**:
  - エラーコンテキスト
  - エラータイプ
  - エラーメッセージ
  - スタックトレース

## トラブルシューティング

### 接続エラーが発生する場合

1. **CORS エラー**

   - すべての API エンドポイントで CORS が有効になっています
   - ブラウザのコンソールでエラーを確認してください

2. **認証エラー**

   - 現在、認証は無効化されています
   - 将来的に認証が必要になる場合は、Authorization ヘッダーを設定してください

3. **JSON-RPC エラー**
   - リクエストが JSON-RPC 2.0 仕様に準拠していることを確認してください
   - `jsonrpc: "2.0"` フィールドが必須です

### よくあるエラーと対処法

| エラーコード | 意味             | 対処法                  |
| ------------ | ---------------- | ----------------------- |
| -32700       | Parse error      | JSON フォーマットを確認 |
| -32600       | Invalid Request  | jsonrpc: "2.0" を含める |
| -32601       | Method not found | 正しいメソッド名を使用  |
| -32603       | Internal error   | Vercel のログを確認     |

### テスト用エンドポイント

接続テスト用：

- GET: `https://biz-clone.vercel.app/api/mcp/test`
- POST: `https://biz-clone.vercel.app/api/mcp/test`

## セキュリティ

- 現在、認証は無効化されています
- 本番環境では適切な認証・認可の実装を推奨します
- CORS は全オリジンで許可されていますが、本番環境では制限することを推奨します
