import { test, expect } from '@playwright/test';
import { TestDataHelper, testUtils } from '../helpers/testHelpers';
import { testAccounts, testPartners, testAnalysisCodes } from '../fixtures/testData';

test.describe('マスタデータ管理機能', () => {
  test.beforeEach(async () => {
    // テスト環境をセットアップ
    await TestDataHelper.setupTestEnvironment();
  });

  test.afterEach(async () => {
    // テストデータをクリーンアップ
    await TestDataHelper.cleanupTestData();
    await TestDataHelper.disconnect();
  });

  test.describe('勘定科目マスタ', () => {
    test('勘定科目一覧ページが正常に表示されること', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // ページタイトルの確認
      await expect(page.locator('h1')).toContainText('勘定科目');
      
      // 新規作成ボタンの確認
      await expect(page.locator('button', { hasText: '新規作成' })).toBeVisible();
      
      // 検索フォームの確認
      await expect(page.locator('input[placeholder*="検索"]')).toBeVisible();
    });

    test('新しい勘定科目を作成できること', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // 新規作成ボタンをクリック
      await page.locator('button', { hasText: '新規作成' }).click();
      
      // フォームに入力
      await page.locator('input[name="accountCode"]').fill('9999');
      await page.locator('input[name="accountName"]').fill('テスト勘定科目');
      await page.locator('select[name="accountType"]').selectOption('asset');
      
      // 保存ボタンをクリック
      await page.locator('button', { hasText: '保存' }).click();
      
      // 成功メッセージの確認
      await expect(page.locator('text=勘定科目を作成しました')).toBeVisible();
      
      // 一覧に戻って作成された項目を確認
      await expect(page.locator('text=9999')).toBeVisible();
      await expect(page.locator('text=テスト勘定科目')).toBeVisible();
    });

    test('勘定科目の編集ができること', async ({ page }) => {
      // テスト用勘定科目を作成
      await TestDataHelper.createTestAccount({
        accountCode: '8888',
        accountName: '編集テスト',
        accountType: 'asset',
      });

      await page.goto('/master/accounts');
      
      // 編集ボタンをクリック
      await page.locator('button[title="編集"]').first().click();
      
      // 勘定科目名を変更
      await page.locator('input[name="accountName"]').fill('編集後のテスト');
      
      // 保存
      await page.locator('button', { hasText: '保存' }).click();
      
      // 更新成功メッセージの確認
      await expect(page.locator('text=勘定科目を更新しました')).toBeVisible();
    });

    test('勘定科目の削除ができること', async ({ page }) => {
      // テスト用勘定科目を作成
      const testAccount = await TestDataHelper.createTestAccount({
        accountCode: '7777',
        accountName: '削除テスト',
        accountType: 'asset',
      });

      await page.goto('/master/accounts');
      
      // 削除ボタンをクリック
      await page.locator('button[title="削除"]').first().click();
      
      // 確認ダイアログで削除を実行
      await page.locator('button', { hasText: '削除する' }).click();
      
      // 削除成功メッセージの確認
      await expect(page.locator('text=勘定科目を削除しました')).toBeVisible();
      
      // 一覧から消えていることを確認
      await expect(page.locator('text=7777')).not.toBeVisible();
    });

    test('勘定科目の検索機能が動作すること', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // 検索キーワードを入力
      await page.locator('input[placeholder*="検索"]').fill('現金');
      await page.keyboard.press('Enter');
      
      // 検索結果が表示されることを確認
      await expect(page.locator('text=現金')).toBeVisible();
    });
  });

  test.describe('取引先マスタ', () => {
    test('取引先一覧ページが正常に表示されること', async ({ page }) => {
      await page.goto('/master/partners');
      
      await expect(page.locator('h1')).toContainText('取引先');
      await expect(page.locator('button', { hasText: '新規作成' })).toBeVisible();
    });

    test('新しい取引先を作成できること', async ({ page }) => {
      await page.goto('/master/partners');
      
      await page.locator('button', { hasText: '新規作成' }).click();
      
      await page.locator('input[name="partnerCode"]').fill('T999');
      await page.locator('input[name="partnerName"]').fill('テスト取引先');
      
      await page.locator('button', { hasText: '保存' }).click();
      
      await expect(page.locator('text=取引先を作成しました')).toBeVisible();
    });

    test('取引先の編集ができること', async ({ page }) => {
      await TestDataHelper.createTestPartner({
        partnerCode: 'T888',
        partnerName: '編集テスト取引先',
      });

      await page.goto('/master/partners');
      
      await page.locator('button[title="編集"]').first().click();
      await page.locator('input[name="partnerName"]').fill('編集後の取引先');
      await page.locator('button', { hasText: '保存' }).click();
      
      await expect(page.locator('text=取引先を更新しました')).toBeVisible();
    });

    test('取引先の削除ができること', async ({ page }) => {
      await TestDataHelper.createTestPartner({
        partnerCode: 'T777',
        partnerName: '削除テスト取引先',
      });

      await page.goto('/master/partners');
      
      await page.locator('button[title="削除"]').first().click();
      await page.locator('button', { hasText: '削除する' }).click();
      
      await expect(page.locator('text=取引先を削除しました')).toBeVisible();
    });
  });

  test.describe('分析コードマスタ', () => {
    test('分析コード一覧ページが正常に表示されること', async ({ page }) => {
      await page.goto('/master/analysis-codes');
      
      await expect(page.locator('h1')).toContainText('分析コード');
      await expect(page.locator('button', { hasText: '新規作成' })).toBeVisible();
    });

    test('新しい分析コードを作成できること', async ({ page }) => {
      await page.goto('/master/analysis-codes');
      
      await page.locator('button', { hasText: '新規作成' }).click();
      
      await page.locator('input[name="analysisCode"]').fill('A999');
      await page.locator('input[name="analysisName"]').fill('テスト分析コード');
      await page.locator('select[name="analysisType"]').selectOption('cost_center');
      
      await page.locator('button', { hasText: '保存' }).click();
      
      await expect(page.locator('text=分析コードを作成しました')).toBeVisible();
    });

    test('分析コードの編集ができること', async ({ page }) => {
      await TestDataHelper.createTestAnalysisCode({
        analysisCode: 'A888',
        analysisName: '編集テスト分析コード',
        analysisType: 'cost_center',
      });

      await page.goto('/master/analysis-codes');
      
      await page.locator('button[title="編集"]').first().click();
      await page.locator('input[name="analysisName"]').fill('編集後の分析コード');
      await page.locator('button', { hasText: '保存' }).click();
      
      await expect(page.locator('text=分析コードを更新しました')).toBeVisible();
    });

    test('分析コードの削除ができること', async ({ page }) => {
      await TestDataHelper.createTestAnalysisCode({
        analysisCode: 'A777',
        analysisName: '削除テスト分析コード',
        analysisType: 'cost_center',
      });

      await page.goto('/master/analysis-codes');
      
      await page.locator('button[title="削除"]').first().click();
      await page.locator('button', { hasText: '削除する' }).click();
      
      await expect(page.locator('text=分析コードを削除しました')).toBeVisible();
    });
  });

  test.describe('マスタデータ統合テスト', () => {
    test('各マスタページ間のナビゲーションが正常に動作すること', async ({ page }) => {
      // 勘定科目から開始
      await page.goto('/master/accounts');
      await expect(page.locator('h1')).toContainText('勘定科目');
      
      // 取引先へ移動
      await page.locator('a[href="/master/partners"]').click();
      await expect(page.locator('h1')).toContainText('取引先');
      
      // 分析コードへ移動
      await page.locator('a[href="/master/analysis-codes"]').click();
      await expect(page.locator('h1')).toContainText('分析コード');
      
      // 勘定科目に戻る
      await page.locator('a[href="/master/accounts"]').click();
      await expect(page.locator('h1')).toContainText('勘定科目');
    });

    test('マスタデータの整合性が保たれること', async ({ page }) => {
      // 取引先を作成
      const partner = await TestDataHelper.createTestPartner({
        partnerCode: 'INTEGRITY_TEST',
        partnerName: '整合性テスト取引先',
      });

      // その取引先を使った仕訳を作成
      const journal = await TestDataHelper.createTestJournal({
        description: '整合性テスト仕訳',
        details: [
          {
            accountCode: '1000',
            amount: 100000,
            side: 'debit',
            description: 'テスト',
            partnerCode: partner.partnerCode,
          },
          {
            accountCode: '4000',
            amount: 100000,
            side: 'credit',
            description: 'テスト',
            partnerCode: partner.partnerCode,
          },
        ],
      });

      // 取引先削除を試行（外部キー制約でエラーになるべき）
      await page.goto('/master/partners');
      
      // 削除ボタンをクリック
      await page.locator(`text=${partner.partnerCode}`).locator('..').locator('button[title="削除"]').click();
      await page.locator('button', { hasText: '削除する' }).click();
      
      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=この取引先は使用中のため削除できません')).toBeVisible();
      
      // 仕訳を削除してから取引先削除を再試行
      await TestDataHelper.deleteJournal(journal.journalNumber);
      
      await page.reload();
      await page.locator(`text=${partner.partnerCode}`).locator('..').locator('button[title="削除"]').click();
      await page.locator('button', { hasText: '削除する' }).click();
      
      // 今度は削除が成功することを確認
      await expect(page.locator('text=取引先を削除しました')).toBeVisible();
    });

    test('フォームバリデーションが全マスタで統一されていること', async ({ page }) => {
      // 勘定科目のバリデーション
      await page.goto('/master/accounts');
      await page.locator('button', { hasText: '新規作成' }).click();
      
      // 必須項目を空のまま保存試行
      await page.locator('button', { hasText: '保存' }).click();
      await expect(page.locator('text=勘定科目コードは必須です')).toBeVisible();
      
      // 取引先のバリデーション
      await page.goto('/master/partners');
      await page.locator('button', { hasText: '新規作成' }).click();
      
      await page.locator('button', { hasText: '保存' }).click();
      await expect(page.locator('text=取引先コードは必須です')).toBeVisible();
      
      // 分析コードのバリデーション
      await page.goto('/master/analysis-codes');
      await page.locator('button', { hasText: '新規作成' }).click();
      
      await page.locator('button', { hasText: '保存' }).click();
      await expect(page.locator('text=分析コードは必須です')).toBeVisible();
    });
  });
});