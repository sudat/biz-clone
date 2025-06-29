/**
 * SSE Demo Page
 * ============================================================================
 * Demonstration page for SSE functionality with MCP integration
 * ============================================================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SSEProvider, useSSE, useJournalEvents, useMasterDataEvents } from '@/components/sse/sse-provider';
import { ConnectionStatus } from '@/components/sse/connection-status';
import { SSEEventType } from '@/lib/sse/types';
import { PlusCircle, Send, RefreshCw, Database, Zap } from 'lucide-react';

/**
 * SSEデモ実装コンポーネント
 */
function SSEDemoImplementation() {
  const { sendEvent, eventHistory } = useSSE();
  const { journalCreated, journalUpdated, clearJournalEvents } = useJournalEvents();
  const { masterDataUpdated, clearMasterDataEvents } = useMasterDataEvents();
  
  const [testJournalData, setTestJournalData] = useState({
    journalNumber: '',
    description: 'SSEテスト仕訳',
    amount: '10000'
  });
  
  const [customEventData, setCustomEventData] = useState({
    eventType: SSEEventType.SYSTEM_STATUS,
    data: '{"message": "カスタムテストイベント"}'
  });

  const [isLoading, setIsLoading] = useState(false);

  // テスト仕訳作成
  const handleCreateTestJournal = async () => {
    setIsLoading(true);
    try {
      const journalData = {
        journalNumber: testJournalData.journalNumber || `TEST${Date.now()}`,
        description: testJournalData.description,
        amount: parseFloat(testJournalData.amount),
        createdAt: new Date().toISOString()
      };

      const success = await sendEvent(SSEEventType.JOURNAL_CREATED, journalData);
      if (success) {
        console.log('Test journal event sent successfully');
      } else {
        console.error('Failed to send test journal event');
      }
    } catch (error) {
      console.error('Error creating test journal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // マスタデータ更新テスト
  const handleUpdateMasterData = async () => {
    const masterData = {
      type: 'accounts',
      action: 'updated',
      data: {
        accountCode: '1001',
        accountName: 'テスト勘定科目',
        updatedAt: new Date().toISOString()
      }
    };

    const success = await sendEvent(SSEEventType.MASTER_DATA_UPDATED, masterData);
    if (success) {
      console.log('Master data update event sent successfully');
    }
  };

  // カスタムイベント送信
  const handleSendCustomEvent = async () => {
    try {
      const parsedData = JSON.parse(customEventData.data);
      const success = await sendEvent(customEventData.eventType, parsedData);
      if (success) {
        console.log('Custom event sent successfully');
      }
    } catch (error) {
      console.error('Error sending custom event:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">SSE リアルタイム通信デモ</h1>
        <p className="text-muted-foreground">
          Server-Sent Events (SSE) を使用したリアルタイム通信のデモンストレーション
        </p>
      </div>

      {/* 接続状態 */}
      <ConnectionStatus showDetails />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* イベント送信セクション */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                テスト仕訳作成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="journalNumber">仕訳番号</Label>
                  <Input
                    id="journalNumber"
                    placeholder="自動生成"
                    value={testJournalData.journalNumber}
                    onChange={(e) => setTestJournalData(prev => ({
                      ...prev,
                      journalNumber: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">金額</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={testJournalData.amount}
                    onChange={(e) => setTestJournalData(prev => ({
                      ...prev,
                      amount: e.target.value
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">摘要</Label>
                <Input
                  id="description"
                  value={testJournalData.description}
                  onChange={(e) => setTestJournalData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                />
              </div>
              <Button 
                onClick={handleCreateTestJournal}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <PlusCircle className="h-4 w-4 mr-2" />
                )}
                テスト仕訳作成
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                マスタデータ更新テスト
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleUpdateMasterData} variant="outline" className="w-full">
                <Database className="h-4 w-4 mr-2" />
                マスタデータ更新イベント送信
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                カスタムイベント送信
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="eventType">イベントタイプ</Label>
                <select
                  id="eventType"
                  className="w-full p-2 border rounded-md"
                  value={customEventData.eventType}
                  onChange={(e) => setCustomEventData(prev => ({
                    ...prev,
                    eventType: e.target.value as SSEEventType
                  }))}
                >
                  <option value={SSEEventType.SYSTEM_STATUS}>システム状態</option>
                  <option value={SSEEventType.JOURNAL_CREATED}>仕訳作成</option>
                  <option value={SSEEventType.JOURNAL_UPDATED}>仕訳更新</option>
                  <option value={SSEEventType.MASTER_DATA_UPDATED}>マスタデータ更新</option>
                </select>
              </div>
              <div>
                <Label htmlFor="eventData">イベントデータ (JSON)</Label>
                <Textarea
                  id="eventData"
                  rows={3}
                  value={customEventData.data}
                  onChange={(e) => setCustomEventData(prev => ({
                    ...prev,
                    data: e.target.value
                  }))}
                />
              </div>
              <Button onClick={handleSendCustomEvent} variant="secondary" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                カスタムイベント送信
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* イベント受信セクション */}
        <div className="space-y-4">
          {/* 仕訳イベント */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                仕訳イベント受信
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearJournalEvents}
                  className="ml-auto"
                >
                  クリア
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {journalCreated && (
                <div className="p-3 bg-green-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">仕訳作成</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(journalCreated, null, 2)}
                  </pre>
                </div>
              )}
              {journalUpdated && (
                <div className="p-3 bg-blue-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">仕訳更新</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(journalUpdated, null, 2)}
                  </pre>
                </div>
              )}
              {!journalCreated && !journalUpdated && (
                <p className="text-muted-foreground text-sm">
                  仕訳イベントを待機中...
                </p>
              )}
            </CardContent>
          </Card>

          {/* マスタデータイベント */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                マスタデータイベント受信
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMasterDataEvents}
                  className="ml-auto"
                >
                  クリア
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {masterDataUpdated ? (
                <div className="p-3 bg-yellow-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">マスタ更新</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(masterDataUpdated, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  マスタデータイベントを待機中...
                </p>
              )}
            </CardContent>
          </Card>

          {/* イベント履歴 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">イベント履歴 ({eventHistory.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {eventHistory.slice(0, 10).map((event, index) => (
                  <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="overflow-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
                {eventHistory.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    イベント履歴はありません
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * SSEデモページ（Provider付き）
 */
export default function SSEDemoPage() {
  return (
    <SSEProvider autoConnect={true} userId="demo-user">
      <SSEDemoImplementation />
    </SSEProvider>
  );
}