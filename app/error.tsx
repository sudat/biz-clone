/**
 * アプリケーションエラーページ
 * ============================================================================
 * Next.js App Routerでのアプリケーション全体のエラーページ
 * ============================================================================
 */

"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // エラーログを記録
    console.error("Application Error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">エラーが発生しました</CardTitle>
          <CardDescription>
            申し訳ございません。予期しないエラーが発生しました。
            {isDevelopment && (
              <div className="mt-2 p-2 bg-muted rounded text-xs text-left font-mono">
                {error.message}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4" />
              再試行
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4" />
                ホームに戻る
              </Button>
            </Link>
          </div>
          {error.digest && (
            <div className="text-center text-xs text-muted-foreground">
              エラーID: {error.digest}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}