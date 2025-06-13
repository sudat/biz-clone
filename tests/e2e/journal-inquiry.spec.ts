import { test, expect } from '@playwright/test';
import { JournalInquiryPage } from '../pages/JournalInquiryPage';
import { TestDataHelper, testUtils } from '../helpers/testHelpers';
import { testJournalPatterns, formTestData } from '../fixtures/testData';

test.describe('仕訳照会機能', () => {
  let journalInquiryPage: JournalInquiryPage;
  let testJournal: any;

  test.beforeEach(async ({ page }) => {
    journalInquiryPage = new JournalInquiryPage(page);
    
    // テスト環境をセットアップ
    await TestDataHelper.setupTestEnvironment();
    
    // テスト用の仕訳を作成
    testJournal = await TestDataHelper.createTestJournal({
      journalDate: new Date(formTestData.validJournalDate),
      description: '照会テスト仕訳',
      details: testJournalPatterns.salesTransaction.details,
    });
  });

  test.afterEach(async () => {
    // テストデータをクリーンアップ
    await TestDataHelper.cleanupTestData();
    await TestDataHelper.disconnect();
  });

  test('仕訳照会ページが正常に表示されること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    await journalInquiryPage.expectPageLoaded();
    
    // 仕訳情報が正しく表示されることを確認
    await journalInquiryPage.expectJournalInfo(
      testJournal.journalNumber,
      testUtils.formatDate(testJournal.journalDate),
      testJournal.description
    );
  });

  test('借方・貸方明細が正しく表示されること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    // 借方明細の確認
    const debitDetails = testJournalPatterns.salesTransaction.details
      .filter(d => d.side === 'debit');
    
    if (debitDetails.length > 0) {
      await journalInquiryPage.expectDetailDisplayed(
        'debit',
        debitDetails[0].accountCode,
        testUtils.formatCurrency(debitDetails[0].amount)
      );
    }

    // 貸方明細の確認
    const creditDetails = testJournalPatterns.salesTransaction.details
      .filter(d => d.side === 'credit');
    
    if (creditDetails.length > 0) {
      await journalInquiryPage.expectDetailDisplayed(
        'credit',
        creditDetails[0].accountCode,
        testUtils.formatCurrency(creditDetails[0].amount)
      );
    }
  });

  test('明細リストに正しい件数が表示されること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    const debitCount = testJournalPatterns.salesTransaction.details
      .filter(d => d.side === 'debit').length;
    const creditCount = testJournalPatterns.salesTransaction.details
      .filter(d => d.side === 'credit').length;
    
    expect(await journalInquiryPage.getDetailListCount('debit')).toBe(debitCount);
    expect(await journalInquiryPage.getDetailListCount('credit')).toBe(creditCount);
  });

  test('明細アイテムをクリックして詳細表示が切り替わること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    // 借方明細の件数が1件以上の場合
    const debitCount = await journalInquiryPage.getDetailListCount('debit');
    if (debitCount > 0) {
      // 最初の明細をクリック
      await journalInquiryPage.clickDetailItem('debit', 0);
      
      // 表示が更新されることを確認（UIの実装に依存）
      await testUtils.wait(300);
      
      const displayInfo = await journalInquiryPage.getDisplayedDetailInfo('debit');
      expect(displayInfo.accountCode).toBeTruthy();
      expect(displayInfo.amount).toBeTruthy();
    }
  });

  test('更新ボタンをクリックして更新ページに遷移すること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    await journalInquiryPage.clickUpdateButton();
    
    // 更新ページに遷移することを確認
    await journalInquiryPage.expectNavigationToUpdatePage(testJournal.journalNumber);
  });

  test('戻るボタンをクリックして一覧に戻ること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    await journalInquiryPage.goBack();
    
    // 一覧ページに遷移することを確認
    await journalInquiryPage.expectNavigationToList();
  });

  test('削除ボタンで仕訳削除ができること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    await journalInquiryPage.clickDeleteButton();
    
    // 削除確認ダイアログがある場合は確認
    await journalInquiryPage.confirmDelete();
    
    // 削除成功を確認
    await journalInquiryPage.expectDeleteSuccess();
  });

  test('複数明細の仕訳照会が正常に動作すること', async () => {
    // 複数明細の仕訳を作成
    const complexJournal = await TestDataHelper.createTestJournal({
      journalDate: new Date(formTestData.validJournalDate),
      description: '複数明細テスト',
      details: testJournalPatterns.complexTransaction.details,
    });

    await journalInquiryPage.goto(complexJournal.journalNumber);
    await journalInquiryPage.expectPageLoaded();

    // 各明細タイプの件数確認
    const debitCount = testJournalPatterns.complexTransaction.details
      .filter(d => d.side === 'debit').length;
    const creditCount = testJournalPatterns.complexTransaction.details
      .filter(d => d.side === 'credit').length;

    expect(await journalInquiryPage.getDetailListCount('debit')).toBe(debitCount);
    expect(await journalInquiryPage.getDetailListCount('credit')).toBe(creditCount);

    // 複数の明細をクリックして表示が切り替わることを確認
    if (debitCount > 1) {
      await journalInquiryPage.clickDetailItem('debit', 0);
      await testUtils.wait(200);
      const firstInfo = await journalInquiryPage.getDisplayedDetailInfo('debit');

      await journalInquiryPage.clickDetailItem('debit', 1);
      await testUtils.wait(200);
      const secondInfo = await journalInquiryPage.getDisplayedDetailInfo('debit');

      // 表示内容が変わることを確認
      expect(firstInfo.accountCode).not.toBe(secondInfo.accountCode);
    }

    // テスト用仕訳を削除
    await TestDataHelper.deleteJournal(complexJournal.journalNumber);
  });

  test('存在しない仕訳番号でアクセスした場合のエラーハンドリング', async ({ page }) => {
    const nonExistentJournalNumber = '20240101999999';
    
    // 存在しない仕訳番号でアクセス
    await page.goto(`/siwake/${nonExistentJournalNumber}`);
    
    // エラーページまたはエラーメッセージが表示されることを確認
    await expect(page.locator('text=仕訳が見つかりません')).toBeVisible();
  });

  test('仕訳番号の形式が正しく表示されること', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    const displayedJournalNumber = await journalInquiryPage.getJournalNumber();
    
    // 仕訳番号の形式確認（YYYYMMDDxxxxxxx）
    expect(displayedJournalNumber).toMatch(/^\d{15}$/);
    expect(displayedJournalNumber).toBe(testJournal.journalNumber);
  });

  test('日付表示形式が正しいこと', async () => {
    await journalInquiryPage.goto(testJournal.journalNumber);
    
    const displayedDate = await journalInquiryPage.getJournalDate();
    
    // 日付形式の確認（実装に応じて調整）
    expect(displayedDate).toMatch(/^\d{4}[/-]\d{2}[/-]\d{2}$/);
  });

  test('摘要が長い場合の表示確認', async () => {
    // 長い摘要の仕訳を作成
    const longDescriptionJournal = await TestDataHelper.createTestJournal({
      journalDate: new Date(formTestData.validJournalDate),
      description: 'A'.repeat(100), // 長い摘要
      details: testJournalPatterns.salesTransaction.details,
    });

    await journalInquiryPage.goto(longDescriptionJournal.journalNumber);
    
    const displayedDescription = await journalInquiryPage.getDescription();
    
    // 長い摘要が適切に表示されることを確認
    expect(displayedDescription.length).toBeGreaterThan(50);
    
    // テスト用仕訳を削除
    await TestDataHelper.deleteJournal(longDescriptionJournal.journalNumber);
  });
});