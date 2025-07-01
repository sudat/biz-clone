# Technical Notes - Cloudflare Workers + Prisma

このドキュメントでは、Cloudflare Workers環境でPrismaクライアントを使用する際の技術的詳細と、実際に発生した問題の解決方法について記載します。

## 🏗️ アーキテクチャ概要

```
Claude Desktop
    ↓ (mcp-remote)
Cloudflare Workers
    ↓ (Prisma + PrismaPg)
Supabase Database
    ↓ (pgbouncer)
PostgreSQL
```

## ⚙️ Prismaクライアント設定

### 正しい初期化方法

Cloudflare Workers環境では、標準的なPrismaクライアント初期化は機能しません。代わりに`PrismaPg`アダプターを使用する必要があります。

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ✅ 正しい方法: 接続設定オブジェクトを直接渡す
function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: 1, // Workersでは1接続に制限
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
  });

  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

// ❌ 間違った方法: Poolオブジェクトを渡す
function incorrectPrismaClient(databaseUrl: string): PrismaClient {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
  });

  // これはエラーを引き起こす
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}
```

### 型安全性の確保

Cloudflare Workers環境では、環境変数の型が不安定な場合があります：

```typescript
function getDatabaseUrl(env: any): string {
  let databaseUrl = env.DATABASE_URL;

  // 型チェックと強制変換
  if (databaseUrl && typeof databaseUrl !== "string") {
    console.log("⚠️ Converting DATABASE_URL to string");
    databaseUrl = String(databaseUrl);
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (typeof databaseUrl !== "string") {
    throw new Error(`DATABASE_URL must be a string, got ${typeof databaseUrl}`);
  }

  return databaseUrl;
}
```

## 🔧 トラブルシューティング詳細

### 問題1: "Received an instance of Object" エラー

**エラーメッセージ**:

```
Invalid `prisma.account.findMany()` invocation:
The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received an instance of Object
```

**根本原因**:
`PrismaPg`アダプターに`Pool`オブジェクトインスタンスを渡していたことが原因。Cloudflare Workers環境では、`PrismaPg`は接続設定オブジェクトを期待します。

**解決方法**:

```typescript
// Before (間違い)
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// After (正解)
const adapter = new PrismaPg({
  connectionString: connectionString,
  max: 1,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
});
```

### 問題2: 異常なシークレット名

**問題**:
Cloudflareのシークレット管理で、シークレット名に値が含まれる形式で設定されていた：

```
SECRET_NAME: "DATABASE_URL=postgresql://..."
```

**正しい設定**:

```bash
# 異常なシークレットを削除
npx wrangler secret delete "DATABASE_URL=postgresql://..."

# 正しい形式で再設定
npx wrangler secret put DATABASE_URL
# プロンプトで値のみを入力: postgresql://...
```

### 問題3: HyperDrive vs 直接接続

**背景**:
CloudflareのHyperDriveは高性能なデータベース接続サービスですが、設定が複雑です。

**実装方針**:

```typescript
function createPrismaClient(hyperdrive?: Hyperdrive, databaseUrl?: string): PrismaClient {
  if (hyperdrive) {
    // HyperDrive経由での接続
    const adapter = new PrismaPg({
      connectionString: hyperdrive.connectionString,
      max: 1,
    });
    return new PrismaClient({ adapter });
  } else {
    // 直接接続（フォールバック）
    const connectionString = databaseUrl || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const adapter = new PrismaPg({
      connectionString: connectionString,
      max: 1,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 60000,
    });

    return new PrismaClient({ adapter });
  }
}
```

## 🔍 デバッグとモニタリング

### デバッグログの実装

```typescript
export class BizCloneMCP {
  private getDatabaseUrl(): string {
    const databaseUrl = this.env.DATABASE_URL;

    // 詳細なデバッグ情報
    console.log("🔍 Environment Variables Debug:");
    console.log("DATABASE_URL exists:", !!databaseUrl);
    console.log("DATABASE_URL type:", typeof databaseUrl);
    console.log("DATABASE_URL constructor:", databaseUrl?.constructor?.name);
    console.log("DATABASE_URL is string:", typeof databaseUrl === "string");
    console.log("DATABASE_URL length:", databaseUrl?.length);

    // 文字列変換とバリデーション
    if (databaseUrl && typeof databaseUrl !== "string") {
      console.log("⚠️ Converting DATABASE_URL to string");
      return String(databaseUrl);
    }

    if (!databaseUrl || typeof databaseUrl !== "string") {
      throw new Error("DATABASE_URL environment variable is not set or invalid");
    }

    return databaseUrl;
  }
}
```

### ログ監視コマンド

```bash
# リアルタイムログ監視
npx wrangler tail biz-clone-remote-mcp

# 詳細フォーマットでのログ監視
npx wrangler tail biz-clone-remote-mcp --format=pretty

# 特定の期間のログ取得
npx wrangler tail biz-clone-remote-mcp --since=10m
```

## 🏆 ベストプラクティス

### 1. 接続プール管理

```typescript
// 接続プールのクリーンアップ
export async function cleanupConnections() {
  try {
    if (global.__prisma) {
      await global.__prisma.$disconnect();
      global.__prisma = undefined;
    }

    if (global.__hyperPrisma) {
      await Promise.all(Object.values(global.__hyperPrisma).map((client) => client.$disconnect()));
      global.__hyperPrisma = undefined;
    }
  } catch (error) {
    console.error("🔗 Connection cleanup error:", error);
  }
}
```

### 2. エラーハンドリング

```typescript
async function executePrismaOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error("🚫 Prisma operation error:", error);

    // 接続エラーの場合はクライアントを再初期化
    if (error.code === "P1001" || error.code === "P1002") {
      console.log("🔄 Reinitializing Prisma client...");
      global.__prisma = undefined;
      // 再試行ロジック
    }

    throw error;
  }
}
```

### 3. パフォーマンス最適化

```typescript
// Supabase Pooler用の最適化設定
const adapter = new PrismaPg({
  connectionString: databaseUrl,
  max: 1, // Workers環境では1接続に制限
  min: 0, // 最小接続数は0
  connectionTimeoutMillis: 30000, // 30秒
  idleTimeoutMillis: 60000, // 60秒でアイドル接続を閉じる
  // Supabase Pooler用の追加設定
  ssl: true,
  application_name: "biz-clone-mcp",
});
```

## 📋 チェックリスト

新しい環境でセットアップする際のチェックリスト：

- [ ] DATABASE_URLシークレットが正しい形式で設定されている
- [ ] PrismaPgアダプターが接続設定オブジェクトを受け取っている
- [ ] 型変換ロジックが実装されている
- [ ] 適切なデバッグログが出力されている
- [ ] 接続プールのクリーンアップが実装されている
- [ ] エラーハンドリングが適切に設定されている

## 🔗 参考資料

- [Prisma Cloudflare Workers Guide](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare-workers)
- [PrismaPg Adapter Documentation](https://www.prisma.io/docs/orm/database-adapters/pg)
- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/platform/environment-variables/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connection-pooling)

---

**最終更新**: 2025年7月1日  
**バージョン**: 1.0.0  
**検証環境**: Cloudflare Workers, Supabase (PostgreSQL), Prisma 5.x
