import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // remote-mcp-serverディレクトリを除外
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // remote-mcp-serverディレクトリを除外
    config.externals = config.externals || [];
    config.externals.push(/^remote-mcp-server\//);

    return config;
  },

  // サーバーサイドのログ出力を有効化
  experimental: {
    serverMinification: false, // デバッグのためminificationを無効化
  },
  // mastraのパッケージ
  serverExternalPackages: ["@mastra/*"],

  // 環境変数
  env: {
    DEBUG: "true", // デバッグログを有効化
  },

  // カスタムヘッダー設定（バックアップ用CORS設定）
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-Requested-With, Accept, Cache-Control",
          },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },

  // ロギング設定
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
