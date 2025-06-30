# 🚀 Biz Clone Remote MCP Server - クイックスタートガイド

## 最速セットアップ（5分で開始）

### 1. GitHub OAuth App作成
[GitHub Developer Settings](https://github.com/settings/developers) で新しいOAuth Appを作成：

```
Homepage URL: http://localhost:8789
Callback URL: http://localhost:8789/callback
```

### 2. 環境設定

```bash
cd biz-clone/remote-mcp-server

# 依存関係インストール
npm install

# 環境変数設定
cp .dev.vars.example .dev.vars
# .dev.varsファイルにGitHub OAuth情報を入力

# ローカルD1データベース作成
wrangler d1 create biz-clone-accounting
wrangler d1 execute biz-clone-accounting --local --file=./database/schema.sql
```

### 3. wrangler.jsonc更新

`YOUR_GITHUB_CLIENT_ID_HERE`を実際のClient IDに変更

### 4. ユーザー権限設定

`src/index.ts`の`ALLOWED_GITHUB_USERS`にあなたのGitHubユーザー名を追加

### 5. 開発サーバー起動

```bash
wrangler dev --local
```

### 6. テスト

```bash
npx @modelcontextprotocol/inspector@latest
```

接続URL: `http://localhost:8789/sse`

## 本番デプロイ

```bash
# 本番用GitHub OAuth App作成（Callback URLを本番用に変更）

# KVとD1作成
wrangler kv:namespace create "OAUTH_KV"
wrangler d1 create biz-clone-accounting

# wrangler.jsonc のIDを更新

# シークレット設定
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY

# データベーススキーマ適用
wrangler d1 execute biz-clone-accounting --file=./database/schema.sql

# デプロイ
wrangler deploy
```

## トラブル時の確認ポイント

1. ✅ GitHub OAuth App のCallback URLが正しい
2. ✅ `ALLOWED_GITHUB_USERS`にユーザー名が追加されている
3. ✅ `.dev.vars`に正しい値が設定されている
4. ✅ D1データベースにスキーマが適用されている

## 次のステップ

Claude Desktop設定を更新：

```json
{
  "mcpServers": {
    "biz-clone-accounting": {
      "command": "npx",
      "args": ["mcp-remote", "YOUR_DEPLOYED_URL/sse"]
    }
  }
}
```

詳細な手順は `README.md` を参照してください。 