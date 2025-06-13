/**
 * グローバルエラーページ
 * ============================================================================
 * Next.js App Routerでのルートレベルのエラーページ
 * レイアウトやプロバイダーのエラーをキャッチする
 * ============================================================================
 */

"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    // グローバルエラーログを記録
    console.error("Global Application Error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <html lang="ja">
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertTriangle style={{ width: '24px', height: '24px', color: '#ef4444' }} />
          </div>
          
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#ef4444',
            margin: '0 0 8px'
          }}>
            システムエラー
          </h1>
          
          <p style={{ 
            color: '#6b7280', 
            margin: '0 0 16px',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            アプリケーションで重大なエラーが発生しました。
            ページを再読み込みしてください。
          </p>

          {isDevelopment && (
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '12px',
              borderRadius: '6px',
              margin: '16px 0',
              fontSize: '12px',
              fontFamily: 'monospace',
              textAlign: 'left',
              color: '#374151',
              wordBreak: 'break-word'
            }}>
              {error.message}
            </div>
          )}

          <button
            onClick={reset}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              margin: '8px 4px'
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            再読み込み
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              margin: '8px 4px'
            }}
          >
            ホーム
          </button>

          {error.digest && (
            <div style={{ 
              marginTop: '16px', 
              fontSize: '12px', 
              color: '#9ca3af'
            }}>
              エラーID: {error.digest}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}