/**
 * SSE Event Helpers
 * ============================================================================
 * Helper functions for sending SSE events from server actions
 * ============================================================================
 */

import { SSEEventType } from './types';

/**
 * SSEイベントを送信する（サーバーサイドから）
 */
export async function sendSSEEvent(
  eventType: SSEEventType,
  data: any,
  targetUserId?: string
): Promise<void> {
  try {
    // 内部API呼び出しでSSEイベントを送信
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/sse/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        data,
        targetUserId
      })
    });

    if (!response.ok) {
      console.error('Failed to send SSE event:', response.statusText);
    }
  } catch (error) {
    // SSE送信エラーは処理を中断しない（ログのみ）
    console.error('SSE event send error:', error);
  }
}

/**
 * 仕訳作成イベントを送信
 */
export async function notifyJournalCreated(journalData: any, userId?: string): Promise<void> {
  await sendSSEEvent(SSEEventType.JOURNAL_CREATED, {
    id: journalData.id,
    journalNumber: journalData.journalNumber,
    date: journalData.date,
    description: journalData.description,
    totalDebitAmount: journalData.totalDebitAmount
  }, userId);
}

/**
 * 仕訳更新イベントを送信
 */
export async function notifyJournalUpdated(journalData: any, userId?: string): Promise<void> {
  await sendSSEEvent(SSEEventType.JOURNAL_UPDATED, {
    id: journalData.id,
    journalNumber: journalData.journalNumber,
    date: journalData.date,
    description: journalData.description,
    totalDebitAmount: journalData.totalDebitAmount
  }, userId);
}

/**
 * 仕訳削除イベントを送信
 */
export async function notifyJournalDeleted(journalId: string, journalNumber: string, userId?: string): Promise<void> {
  await sendSSEEvent(SSEEventType.JOURNAL_DELETED, {
    id: journalId,
    journalNumber: journalNumber
  }, userId);
}

/**
 * マスタデータ更新イベントを送信
 */
export async function notifyMasterDataUpdated(
  masterType: 'accounts' | 'partners' | 'analysis_codes' | 'sub_accounts',
  action: 'created' | 'updated' | 'deleted',
  data: any,
  userId?: string
): Promise<void> {
  await sendSSEEvent(SSEEventType.MASTER_DATA_UPDATED, {
    masterType,
    action,
    data
  }, userId);
}