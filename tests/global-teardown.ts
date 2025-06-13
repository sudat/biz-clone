import { FullConfig } from '@playwright/test';
import { TestDataHelper } from './helpers/testHelpers';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 グローバルティアダウンを開始...');
  
  try {
    // すべてのテストデータをクリーンアップ
    console.log('🗑️ すべてのテストデータをクリーンアップ中...');
    await TestDataHelper.cleanupTestData();
    
    // データベース接続を閉じる
    console.log('🔌 データベース接続を閉じています...');
    await TestDataHelper.disconnect();
    
    console.log('✅ グローバルティアダウンが完了しました');
  } catch (error) {
    console.error('❌ グローバルティアダウンでエラーが発生しました:', error);
    // ティアダウンのエラーはテストの失敗にはしない
    console.warn('⚠️ ティアダウンエラーを無視して続行します');
  }
}

export default globalTeardown;