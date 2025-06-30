# MCPメタデータ・テスト機能 実装ドキュメント

## 概要

remote-mcp-serverに以下の3つのMCPツールを実装しました：

1. `get_mcp_metadata` - MCPサーバーのメタデータ取得
2. `test_mcp_tools` - MCPツールのテスト実行
3. `list_available_tools` - 利用可能ツール一覧（詳細版）

## 実装詳細

### 1. `get_mcp_metadata`

MCPサーバーの詳細なメタデータを取得するツールです。

**機能：**
- サーバー情報（名前、バージョン、説明）
- 機能（ツール数、カテゴリ、認証方式、データベース）
- 環境情報（ランタイム、Node環境、Hyperdrive状態）
- エンドポイント情報
- ユーザー情報（現在認証されているユーザー）

**パラメータ：** なし

**使用例：**
```json
{
  "server": {
    "name": "Biz Clone Accounting MCP Server",
    "version": "1.0.0",
    "description": "Remote MCP server for Biz Clone accounting system",
    "author": "Biz Clone Development Team",
    "protocolVersion": "2024-11-30"
  },
  "capabilities": {
    "tools": {
      "estimated_count": 25,
      "categories": ["connection", "journal", "master", "reports", "search", "system", "metadata", "attachments"]
    }
  }
}
```

### 2. `test_mcp_tools`

MCPツールの安全なテスト実行を行うツールです。

**機能：**
- 指定されたツールの存在確認
- パラメータバリデーション（validateOnly=trueの場合）
- 安全なモック実行（読み取り専用ツールのみ）
- 実行時間計測

**パラメータ：**
- `toolName` (string) - テストするツール名
- `testParams` (object, optional) - テストパラメータ
- `validateOnly` (boolean, default: false) - パラメータ検証のみ実行

**安全な設計：**
- 書き込み操作ツールは実際には実行されない
- モックレスポンスで動作確認のみ
- データベースへの影響なし

**使用例：**
```javascript
// パラメータ検証のみ
await testMcpTools({
  toolName: "create_journal",
  validateOnly: true,
  testParams: { journalDate: "2024-01-01" }
});

// 安全なテスト実行
await testMcpTools({
  toolName: "get_accounts",
  testParams: { limit: 5 }
});
```

### 3. `list_available_tools`

利用可能なMCPツールの詳細一覧を取得するツールです。

**機能：**
- 全ツールの一覧表示
- カテゴリ別フィルタリング
- 各ツールの詳細情報（名前、説明、カテゴリ、読み取り専用フラグ）
- オプションでスキーマ情報も含む

**パラメータ：**
- `category` (string, optional) - カテゴリでフィルタ
- `includeSchema` (boolean, default: false) - 入力スキーマを含める

**カテゴリ一覧：**
- `connection` - 接続テスト
- `journal` - 仕訳関連
- `master` - マスタデータ関連  
- `reports` - レポート関連
- `search` - 検索関連
- `system` - システム操作
- `metadata` - メタデータ・テスト
- `attachments` - 添付ファイル関連

**使用例：**
```javascript
// 全ツール一覧
await listAvailableTools();

// 仕訳関連ツールのみ
await listAvailableTools({ category: "journal" });

// スキーマ情報も含む
await listAvailableTools({ includeSchema: true });
```

## 技術的特徴

### エラーハンドリング
- 統一された JSON レスポンス形式
- 適切なエラーメッセージの日本語対応
- TypeScript型安全性の確保

### セキュリティ
- 書き込み操作の安全なテスト実行
- ユーザー認証情報の適切な取り扱い
- 危険なツールの実行制限

### MCPプロトコル準拠
- app/api/mcp の実装パターンに従った設計
- Zodスキーマによるパラメータバリデーション
- MCPプロトコル 2024-11-30 準拠

## 使用方法

これらのツールは、MCPクライアント（Claude Code等）から以下のように呼び出せます：

```javascript
// メタデータ取得
const metadata = await mcpClient.callTool("get_mcp_metadata", {});

// ツールテスト
const testResult = await mcpClient.callTool("test_mcp_tools", {
  toolName: "search_journals",
  testParams: { limit: 10 }
});

// ツール一覧取得
const tools = await mcpClient.callTool("list_available_tools", {
  category: "journal",
  includeSchema: false
});
```

## ユーザー受入テスト

実装後の動作確認のためのチェックリスト：

### ✅ 基本動作確認
- [ ] `get_mcp_metadata` が正常に実行され、サーバー情報が返される
- [ ] `test_mcp_tools` でツール名の存在確認ができる
- [ ] `list_available_tools` で全ツール一覧が取得できる

### ✅ パラメータテスト
- [ ] `test_mcp_tools` の `validateOnly=true` で検証のみ実行できる
- [ ] `list_available_tools` のカテゴリフィルタが正常に動作する
- [ ] 不正なツール名での適切なエラー処理

### ✅ セキュリティテスト
- [ ] 書き込み系ツールがテスト実行で実際のDBを変更しない
- [ ] 認証情報が適切にレスポンスに含まれる
- [ ] エラー情報に機密データが含まれない

### ✅ 型安全性
- [ ] TypeScriptコンパイルエラーがない（`npm run type-check`）
- [ ] Zodスキーマバリデーションが正常に動作する

## 注意事項

1. **開発環境での動作**：Cloudflare Workers環境でPrismaを使用するため、本番環境ではHyperdriveの設定が必要です。

2. **テスト実行の制限**：安全性のため、実際のデータベース操作を伴うツールはモック実行のみです。

3. **認証**：全ツールはGitHub OAuth認証が必要です。

4. **レスポンス形式**：全てのツールはMCPプロトコルに準拠したJSON形式でレスポンスを返します。