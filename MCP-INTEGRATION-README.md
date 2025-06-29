# MCP-Server統合ドキュメント

Biz Clone会計システムのMCP-server機能をNext.js API Routesに統合したMVP版のドキュメントです。

## 🎯 概要

MCP（Model Context Protocol）-serverの機能をNext.jsアプリケーションに統合し、CLAUDEから直接会計システムにアクセス可能にしました。MVP版では認証機能を削除し、簡単にテストできる状態になっています。

## 🚀 デプロイ後のURL構成

Vercelにデプロイ後のアクセス方法：

```
メインアプリケーション: https://[your-app-name].vercel.app/
MCP API エンドポイント: https://[your-app-name].vercel.app/api/[endpoint]
```

## 📚 利用可能なAPIエンドポイント

### 🏥 ヘルスチェック

```bash
GET https://[your-app-name].vercel.app/api/health
```

### 📊 仕訳管理

```bash
# 仕訳一覧取得
GET https://[your-app-name].vercel.app/api/journal

# 新規仕訳作成
POST https://[your-app-name].vercel.app/api/journal
Content-Type: application/json

{
  "header": {
    "journalDate": "2024-12-29",
    "description": "現金売上の計上"
  },
  "details": [
    {
      "debitCredit": "debit",
      "accountCode": "1000",
      "baseAmount": 10000,
      "taxAmount": 0,
      "totalAmount": 10000,
      "description": "現金売上"
    },
    {
      "debitCredit": "credit", 
      "accountCode": "4000",
      "baseAmount": 10000,
      "taxAmount": 0,
      "totalAmount": 10000,
      "description": "売上高"
    }
  ]
}

# 仕訳更新
PUT https://[your-app-name].vercel.app/api/journal/[journalNumber]

# 仕訳削除
DELETE https://[your-app-name].vercel.app/api/journal/[journalNumber]
```

### 🏢 マスタデータ管理

#### 勘定科目

```bash
# 勘定科目一覧
GET https://[your-app-name].vercel.app/api/master/accounts

# 勘定科目作成
POST https://[your-app-name].vercel.app/api/master/accounts
Content-Type: application/json

{
  "accountCode": "1001",
  "accountName": "普通預金",
  "accountType": "資産"
}
```

#### 取引先

```bash
# 取引先一覧
GET https://[your-app-name].vercel.app/api/master/partners

# 取引先作成
POST https://[your-app-name].vercel.app/api/master/partners
Content-Type: application/json

{
  "partnerCode": "C001",
  "partnerName": "株式会社サンプル",
  "partnerType": "得意先"
}
```

#### 部門

```bash
# 部門一覧
GET https://[your-app-name].vercel.app/api/master/departments

# 部門作成
POST https://[your-app-name].vercel.app/api/master/departments
Content-Type: application/json

{
  "departmentCode": "D001",
  "departmentName": "営業部"
}
```

#### 分析コード

```bash
# 分析コード一覧
GET https://[your-app-name].vercel.app/api/master/analysis-codes

# 分析コード作成
POST https://[your-app-name].vercel.app/api/master/analysis-codes
Content-Type: application/json

{
  "analysisCode": "P001",
  "analysisName": "プロジェクトA",
  "analysisType": "プロジェクト"
}
```

### 🔍 検索・分析

```bash
# 統合検索
GET https://[your-app-name].vercel.app/api/search/unified?query=現金

# 試算表取得
GET https://[your-app-name].vercel.app/api/reports/trial-balance?dateFrom=2024-01-01&dateTo=2024-12-31

# 仕訳集計
GET https://[your-app-name].vercel.app/api/reports/journal-summary?dateFrom=2024-01-01&dateTo=2024-12-31&groupBy=account
```

### 🛠️ MCPツール一覧

```bash
# 利用可能なMCPツール一覧取得
GET https://[your-app-name].vercel.app/api/mcp/tools
```

## 🔧 CLAUDEからの利用方法

CLAUDEからMCP統合APIを利用する場合：

```javascript
// 仕訳作成の例
const response = await fetch('https://[your-app-name].vercel.app/api/journal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    header: {
      journalDate: '2024-12-29',
      description: '現金売上の計上'
    },
    details: [
      {
        debitCredit: 'debit',
        accountCode: '1000',
        baseAmount: 10000,
        taxAmount: 0,
        totalAmount: 10000
      },
      {
        debitCredit: 'credit',
        accountCode: '4000', 
        baseAmount: 10000,
        taxAmount: 0,
        totalAmount: 10000
      }
    ]
  })
});

const result = await response.json();
```

## 📋 共通仕様

### レスポンス形式

```json
{
  "success": true,
  "data": { /* 結果データ */ },
  "message": "処理が正常に完了しました"
}
```

### エラーレスポンス形式

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "data": {
    "type": "validation",
    "details": { /* エラー詳細 */ }
  }
}
```

### ページネーション

```bash
GET /api/[endpoint]?page=1&limit=20
```

### フィルタリング

```bash
# 期間指定
GET /api/journal?fromDate=2024-01-01&toDate=2024-12-31

# 検索
GET /api/master/accounts?searchTerm=現金

# ソート
GET /api/journal?sortBy=journalDate&sortOrder=desc
```

## 🔐 認証について（MVP版）

**MVP版では認証機能を削除しており、すべてのエンドポイントにパブリックアクセス可能です。**

本番環境では以下の認証機能を有効化することができます：
- OAuth 2.1 Bearer Token認証
- スコープベースの権限制御（mcp:read, mcp:write, mcp:admin）
- JWT形式のアクセストークン

## 🔧 開発・テスト

### ローカル開発

```bash
# 開発サーバー起動
bun run dev

# APIテスト例
curl http://localhost:3000/api/health
curl http://localhost:3000/api/master/accounts
```

### ビルド・デプロイ

```bash
# ビルド
bun run build

# Vercelデプロイ
vercel --prod
```

## 📊 主要機能

- ✅ **仕訳管理**: 作成・更新・削除・検索
- ✅ **マスタデータ管理**: 勘定科目・取引先・部門・分析コード
- ✅ **統合検索**: 全データ横断検索
- ✅ **試算表**: 期間指定での残高集計
- ✅ **仕訳集計**: 勘定科目・取引先・期間別集計
- ✅ **エラーハンドリング**: 詳細なエラーメッセージ
- ✅ **バリデーション**: Zodスキーマによる型安全性
- ✅ **ページネーション**: 大量データ対応

## 🎯 将来的な拡張

1. **認証機能の再有効化**: `allowPublic: false` の設定
2. **リアルタイム機能**: Server-Sent Events（SSE）の追加
3. **ファイル添付**: 仕訳への証憑ファイル添付機能
4. **承認ワークフロー**: 仕訳承認機能の追加
5. **監査ログ**: 操作履歴の記録機能

## 🆘 トラブルシューティング

### よくある問題

1. **仕訳作成時のdebit/creditエラー**: 
   - APIでは `"debit"/"credit"` を使用
   - 内部では自動的に `"D"/"C"` に変換

2. **日本語パラメータ**: 
   - URLエンコードが必要（`encodeURIComponent()`使用）

3. **必須パラメータエラー**:
   - 試算表API等では `dateFrom`, `dateTo` が必須

4. **データベース接続エラー**:
   - `/api/health` でデータベース状況を確認

### サポート

- 技術仕様: 本ドキュメント参照
- エラー詳細: APIレスポンスの `error` と `details` を確認
- ヘルスチェック: `/api/health` エンドポイントで状況確認