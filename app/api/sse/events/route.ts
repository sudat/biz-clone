/**
 * SSE Events API for MCP Operations
 * ============================================================================
 * API endpoint for sending events from MCP operations
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { sseEventManager } from '@/lib/sse/event-manager';
import { SSEEventType, SSEEventRequest } from '@/lib/sse/types';

/**
 * イベント送信のPOSTハンドラー
 */
export async function POST(request: NextRequest) {
  try {
    const body: SSEEventRequest = await request.json();
    
    // リクエストボディの検証
    if (!body.eventType || !body.data) {
      return NextResponse.json(
        { error: 'eventType and data are required' },
        { status: 400 }
      );
    }

    // イベントデータの作成
    const eventData = {
      type: body.eventType,
      timestamp: new Date().toISOString(),
      data: body.data,
      userId: body.targetUserId
    };

    // イベントの配信
    if (body.targetUserId) {
      // 特定のユーザーに送信
      sseEventManager.sendEventToUser(body.targetUserId, eventData);
      console.log(`SSE event sent to user ${body.targetUserId}:`, body.eventType);
    } else {
      // 全クライアントにブロードキャスト
      sseEventManager.broadcastEvent(eventData);
      console.log(`SSE event broadcasted:`, body.eventType);
    }

    return NextResponse.json({
      success: true,
      eventType: body.eventType,
      timestamp: eventData.timestamp,
      activeConnections: sseEventManager.getActiveConnections()
    });

  } catch (error) {
    console.error('SSE event send error:', error);
    return NextResponse.json(
      { error: 'Failed to send SSE event' },
      { status: 500 }
    );
  }
}

/**
 * アクティブ接続情報の取得
 */
export async function GET() {
  try {
    const connections = sseEventManager.getConnectionsInfo();
    
    return NextResponse.json({
      activeConnections: sseEventManager.getActiveConnections(),
      connections: connections.map(conn => ({
        id: conn.id,
        userId: conn.userId,
        lastHeartbeat: conn.lastHeartbeat.toISOString()
      }))
    });
  } catch (error) {
    console.error('Failed to get SSE connections info:', error);
    return NextResponse.json(
      { error: 'Failed to get connections info' },
      { status: 500 }
    );
  }
}

/**
 * プリフライトリクエスト対応
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}