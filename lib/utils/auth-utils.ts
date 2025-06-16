/**
 * 認証・ユーザ管理ユーティリティ
 * ============================================================================
 * Server ActionsでCookieから現在ユーザを取得する機能
 * ============================================================================
 */

import { cookies } from 'next/headers';

/**
 * CookieからログインしているユーザIDを取得
 */
export async function getCurrentUserIdFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('current-user-id');
    return userIdCookie?.value || null;
  } catch (error) {
    console.error('Cookieからユーザ情報を取得できません:', error);
    return null;
  }
}