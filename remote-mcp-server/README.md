# Biz Clone Remote MCP Server

Biz Clone会計システム専用のリモートMCPサーバーです。GitHub OAuth認証を使用して、Claudeから安全に会計データにアクセスできます。

## 🎯 概要

- **認証**: GitHub OAuth 2.1によるセキュアな認証
- **プラットフォーム**: Cloudflare Workers + D1 Database
- **機能**: 仕訳作成・検索、勘定科目管理、試算表作成
- **接続**: Claude DesktopからmCP-remote経由でアクセス

## 🚀 セットアップ手順

### 1. GitHub OAuth Appの作成

1. [GitHub Developer Settings](https://github.com/settings/developers)にアクセス
2. "New OAuth App"をクリック
3. 以下の設定を入力：

**本番環境用**

```
Application name: Biz Clone MCP Server
Homepage URL: https://biz-clone-remote-mcp.<your-subdomain>.workers.dev
Authorization callback URL: https://biz-clone-remote-mcp.<your-subdomain>.workers.dev/callback
```

**開発環境用**

```
Application name: Biz Clone MCP Server (Dev)
Homepage URL: http://localhost:8789
Authorization callback URL: http://localhost:8789/callback
```

4. Client IDとClient Secretを控えておく

### 2. Cloudflareリソースの作成

#### KV Namespaceの作成

```bash
cd biz-clone/remote-mcp-server
wrangler kv:namespace create "OAUTH_KV"
```

作成されたIDを`wrangler.jsonc`の`kv_namespaces`セクションに設定：

```jsonc
"kv_namespaces": [
  {
    "binding": "OAUTH_KV",
    "id": "your-kv-namespace-id"
  }
]
```

#### D1 Databaseの作成

```bash
wrangler d1 create biz-clone-accounting
```

作成されたIDを`wrangler.jsonc`の`d1_databases`セクションに設定：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "biz-clone-accounting",
    "database_id": "your-d1-database-id"
  }
]
```

#### データベーススキーマの適用

```bash
wrangler d1 execute biz-clone-accounting --file=./database/schema.sql
```

### 3. 環境変数とシークレットの設定

#### 本番環境用シークレット

```bash
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
# 任意のランダム文字列: openssl rand -hex 32
```

#### GitHub Client IDの設定

`wrangler.jsonc`の`vars`セクションを更新：

```jsonc
"vars": {
  "GITHUB_CLIENT_ID": "your-github-client-id"
}
```

#### 開発環境用設定

`.dev.vars`ファイルを作成：

```env
GITHUB_CLIENT_ID=your-development-github-client-id
GITHUB_CLIENT_SECRET=your-development-github-client-secret
COOKIE_ENCRYPTION_KEY=your-random-encryption-key
```

### 4. ユーザーアクセス権限の設定

`src/index.ts`の`ALLOWED_GITHUB_USERS`にアクセス許可するGitHubユーザー名を追加：

```typescript
const ALLOWED_GITHUB_USERS = new Set<string>([
  "yourusername", // あなたのGitHubユーザー名
  "accountant1", // 経理担当者のユーザー名
  "manager1", // 管理者のユーザー名
]);
```

### 5. 依存関係のインストールとデプロイ

```bash
cd biz-clone/remote-mcp-server
npm install
wrangler deploy
```

## 🔧 開発とテスト

### ローカル開発サーバーの起動

```bash
wrangler dev
```

### Inspector でのテスト

```bash
npx @modelcontextprotocol/inspector@latest
```

接続URL: `http://localhost:8789/sse`

### データベースのローカルテスト

```bash
# ローカルD1データベースの作成
wrangler d1 execute biz-clone-accounting --local --file=./database/schema.sql

# ローカルでの開発
wrangler dev --local
```

## 🎮 Claude Desktop での使用

### 設定ファイルの更新

Claude Desktop の設定ファイル（`claude_desktop_config.json`）を更新：

```json
{
  "mcpServers": {
    "biz-clone-accounting": {
      "command": "npx",
      "args": ["mcp-remote", "https://biz-clone-remote-mcp.<your-subdomain>.workers.dev/sse"]
    }
  }
}
```

### 認証フロー

1. Claude Desktopを再起動
2. ブラウザウィンドウが開いてGitHub認証画面が表示される
3. GitHubアカウントでログイン
4. 認証完了後、Claudeでツールが利用可能になる

## 🛠️ 利用可能なツール

### 基本ツール

- `test_connection`: 接続テスト
- `get_user_info`: 認証ユーザー情報取得

### 会計ツール（認証ユーザーのみ）

- `check_db_health`: データベース接続確認
- `get_accounts`: 勘定科目一覧取得
- `create_journal`: 仕訳作成
- `search_journals`: 仕訳検索
- `get_trial_balance`: 試算表取得

### 使用例

```
# 勘定科目の確認
勘定科目「現金」を検索してください

# 仕訳の作成
以下の仕訳を作成してください：
- 日付: 2024-12-29
- 摘要: 現金売上
- 借方: 現金 10,000円
- 貸方: 売上高 10,000円

# 試算表の作成
2024年12月の試算表を作成してください
```

## 🔒 セキュリティ機能

### アクセス制御

- GitHub OAuth 2.1による認証
- 許可されたGitHubユーザーのみがアクセス可能
- 勘定科目、仕訳データへのアクセス制限

### データ保護

- すべての認証トークンはKVストレージに暗号化保存
- D1データベースでの取引データ保護
- HTTPS通信の強制

## 📊 データベース構造

### 主要テーブル

- `account_master`: 勘定科目マスタ
- `journal_header`: 仕訳ヘッダ
- `journal_detail`: 仕訳明細
- `partner_master`: 取引先マスタ
- `tax_rate_master`: 税区分マスタ

詳細なスキーマは`database/schema.sql`を参照してください。

## 🔧 トラブルシューティング

### よくある問題

#### 1. 認証エラー

```
Error: Authentication failed
```

**解決方法**: GitHub OAuth設定とCallback URLを確認

#### 2. データベース接続エラー

```
Error: Database connection failed
```

**解決方法**: D1データベースIDとスキーマ適用を確認

#### 3. ツールが表示されない

**解決方法**:

- `ALLOWED_GITHUB_USERS`にユーザー名が追加されているか確認
- Claude Desktopの再起動

#### 4. Prismaクライアント型エラー ⚠️ **重要**

```
Invalid `prisma.account.findMany()` invocation:
The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received an instance of Object
```

**原因**: Cloudflare Workers環境でのPrismaクライアント初期化時に、`PrismaPg`アダプターに不正なオブジェクトを渡している

**解決方法**:

1. **正しいPrismaPgアダプター設定**:

   ```typescript
   // ❌ 間違い: poolオブジェクトを渡す
   const pool = new Pool({ connectionString });
   const adapter = new PrismaPg(pool);

   // ✅ 正解: 接続設定オブジェクトを渡す
   const adapter = new PrismaPg({
     connectionString: connectionString,
     max: 1,
     connectionTimeoutMillis: 30000,
     idleTimeoutMillis: 60000,
   });
   ```

2. **DATABASE_URLの型安全性確保**:
   ```typescript
   // 文字列として強制変換
   if (connectionString && typeof connectionString !== "string") {
     connectionString = String(connectionString);
   }
   ```

#### 5. DATABASE_URL環境変数エラー

```
DATABASE_URL environment variable is not set
```

**原因**: Cloudflare Workers環境で環境変数が正しく設定されていない

**解決方法**:

1. **シークレット設定の確認**:

   ```bash
   # シークレット一覧を確認
   npx wrangler secret list

   # DATABASE_URLシークレットの設定
   npx wrangler secret put DATABASE_URL
   ```

2. **異常なシークレット名の修正**:

   ```bash
   # 異常な形式のシークレットを削除
   npx wrangler secret delete "DATABASE_URL=postgresql://..."

   # 正しい形式でシークレットを再設定
   npx wrangler secret put DATABASE_URL
   # 値のみを入力: postgresql://username:password@host:port/database?pgbouncer=true
   ```

### デバッグ方法

#### ログの確認

```bash
wrangler tail biz-clone-remote-mcp
```

#### リアルタイムログ監視

```bash
# 特定のワーカー名でログ監視
npx wrangler tail biz-clone-remote-mcp

# エラー発生時の詳細確認
npx wrangler tail biz-clone-remote-mcp --format=pretty
```

#### ローカルでのデバッグ

```bash
wrangler dev --local
```

#### データベース内容の確認

```bash
wrangler d1 execute biz-clone-accounting --command="SELECT * FROM account_master LIMIT 5"
```

#### 環境変数の確認

```bash
# シークレット一覧
npx wrangler secret list

# 環境変数確認（デバッグログで確認）
# src/index.tsの初期化時にログ出力される
```

## 🔬 技術的詳細 (Prisma + Cloudflare)

### Prismaクライアント初期化の重要な注意点

Cloudflare Workers環境では、標準的なPrismaクライアント初期化は機能しません。以下の重要なポイントに注意してください：

#### ✅ 正しいPrismaPgアダプター設定

```typescript
import { PrismaPg } from "@prisma/adapter-pg";

// ✅ 正解: 接続設定オブジェクトを直接渡す
const adapter = new PrismaPg({
  connectionString: databaseUrl,
  max: 1, // Workersでは1接続に制限
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
});

const prisma = new PrismaClient({ adapter });
```

#### ❌ よくある間違い

```typescript
// ❌ 間違い: poolオブジェクトを渡すとエラーになる
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool); // これは "Received an instance of Object" エラーを引き起こす
```

#### 型安全性の確保

```typescript
// DATABASE_URLの型チェックと変換
let connectionString = env.DATABASE_URL;
if (connectionString && typeof connectionString !== "string") {
  connectionString = String(connectionString);
}
```

### Cloudflareシークレットのベストプラクティス

#### 正しいシークレット設定

```bash
# ✅ 正しい方法
npx wrangler secret put DATABASE_URL
# プロンプトで値のみを入力: postgresql://username:password@host:port/database

# ✅ シークレット確認
npx wrangler secret list
```

#### 異常なシークレットの修正

```bash
# 異常な形式のシークレットが設定されている場合
npx wrangler secret delete "DATABASE_URL=postgresql://..."
npx wrangler secret put DATABASE_URL
```

## 📝 設定ファイル説明

### `wrangler.jsonc`

- Cloudflare Workers設定
- D1データベースとKVバインディング
- 環境変数設定

### `.dev.vars` (開発用)

- GitHub OAuth credentials
- 暗号化キー

### `database/schema.sql`

- D1データベーススキーマ
- 初期マスタデータ

## 🚀 本番運用

### モニタリング

- Cloudflare Analytics でアクセス状況を監視
- `wrangler tail` でリアルタイムログ監視

### バックアップ

```bash
# データベースダンプ
wrangler d1 export biz-clone-accounting --output=backup.sql
```

### スケーリング

- Cloudflare Workersは自動スケーリング
- D1データベースは100GBまで対応

## 📞 サポート

問題が発生した場合：

1. このREADMEのトラブルシューティングセクションを確認
2. GitHub OAuth設定とCloudflare設定を再確認
3. ログを確認して詳細なエラー情報を取得

---

## バージョン情報

- Version: 1.0.0
- MCP SDK: ^1.13.0
- Cloudflare Workers OAuth Provider: ^0.0.5
- 対応Claude版: Claude Desktop (最新版)
