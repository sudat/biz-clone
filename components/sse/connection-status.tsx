/**
 * SSE Connection Status Component
 * ============================================================================
 * UI component for displaying SSE connection status
 * ============================================================================
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSSE } from './sse-provider';
import { SSEConnectionState } from '@/lib/sse/client';
import { Wifi, WifiOff, AlertCircle, RotateCcw, Activity } from 'lucide-react';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * SSE接続状態表示コンポーネント
 */
export function ConnectionStatus({ showDetails = false, className }: ConnectionStatusProps) {
  const { connectionState, isConnected, eventHistory, connect, disconnect, clearEventHistory } = useSSE();

  const getStatusConfig = (state: SSEConnectionState) => {
    switch (state) {
      case SSEConnectionState.CONNECTED:
        return {
          label: '接続中',
          variant: 'default' as const,
          icon: <Wifi className="h-4 w-4" />,
          color: 'text-green-600'
        };
      case SSEConnectionState.CONNECTING:
        return {
          label: '接続中...',
          variant: 'secondary' as const,
          icon: <RotateCcw className="h-4 w-4 animate-spin" />,
          color: 'text-blue-600'
        };
      case SSEConnectionState.RECONNECTING:
        return {
          label: '再接続中...',
          variant: 'secondary' as const,
          icon: <RotateCcw className="h-4 w-4 animate-spin" />,
          color: 'text-yellow-600'
        };
      case SSEConnectionState.ERROR:
        return {
          label: 'エラー',
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-600'
        };
      case SSEConnectionState.DISCONNECTED:
      default:
        return {
          label: '切断',
          variant: 'outline' as const,
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-gray-600'
        };
    }
  };

  const statusConfig = getStatusConfig(connectionState);

  if (!showDetails) {
    // シンプルな状態表示
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={statusConfig.color}>
          {statusConfig.icon}
        </span>
        <Badge variant={statusConfig.variant}>
          {statusConfig.label}
        </Badge>
      </div>
    );
  }

  // 詳細な状態表示
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          リアルタイム通信状態
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 接続状態 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={statusConfig.color}>
              {statusConfig.icon}
            </span>
            <span className="text-sm font-medium">状態:</span>
          </div>
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* 接続制御ボタン */}
        <div className="flex gap-2">
          {isConnected ? (
            <Button variant="outline" size="sm" onClick={disconnect}>
              切断
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={connect}>
              接続
            </Button>
          )}
        </div>

        {/* イベント履歴 */}
        {eventHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">最近のイベント:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearEventHistory}
                className="h-auto p-1 text-xs"
              >
                クリア
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {eventHistory.slice(0, 3).map((event, index) => (
                <div key={index} className="flex justify-between">
                  <span>{event.type}</span>
                  <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {eventHistory.length > 3 && (
                <div className="text-center mt-1">
                  ... 他 {eventHistory.length - 3} 件
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ヘッダー用の簡易状態表示
 */
export function HeaderConnectionStatus() {
  return <ConnectionStatus className="ml-auto" />;
}

/**
 * フローティング状態表示
 */
export function FloatingConnectionStatus() {
  const { connectionState } = useSSE();
  
  // 接続中は表示しない
  if (connectionState === SSEConnectionState.CONNECTED) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <ConnectionStatus showDetails className="shadow-lg" />
    </div>
  );
}