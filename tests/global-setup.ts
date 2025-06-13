import { FullConfig } from '@playwright/test';
import { TestDataHelper } from './helpers/testHelpers';

async function globalSetup(config: FullConfig) {
  console.log('🔧 グローバルセットアップを開始...');
  
  try {
    // データベース接続確認
    console.log('📊 データベース接続を確認中...');
    
    // 既存のテストデータをクリーンアップ
    console.log('🧹 既存のテストデータをクリーンアップ中...');
    await TestDataHelper.cleanupTestData();
    
    // 基本マスタデータをセットアップ
    console.log('📝 基本マスタデータをセットアップ中...');
    await TestDataHelper.setupTestEnvironment();
    
    console.log('✅ グローバルセットアップが完了しました');
  } catch (error) {
    console.error('❌ グローバルセットアップでエラーが発生しました:', error);
    throw error;
  }
}

export default globalSetup;