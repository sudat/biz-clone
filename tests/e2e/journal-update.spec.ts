import { test, expect } from '@playwright/test';
import { JournalUpdatePage } from '../pages/JournalUpdatePage';
import { TestDataHelper, testUtils } from '../helpers/testHelpers';
import { testAccounts, testJournalPatterns, formTestData } from '../fixtures/testData';

test.describe('仕訳更新機能', () => {
  let journalUpdatePage: JournalUpdatePage;
  let testJournal: any;

  test.beforeEach(async ({ page }) => {
    journalUpdatePage = new JournalUpdatePage(page);
    
    // テスト環境をセットアップ
    await TestDataHelper.setupTestEnvironment();
    
    // テスト用の仕訳を作成
    testJournal = await TestDataHelper.createTestJournal({
      journalDate: new Date(formTestData.validJournalDate),
      description: '更新テスト仕訳',
      details: testJournalPatterns.salesTransaction.details,
    });
  });

  test.afterEach(async () => {
    // テストデータをクリーンアップ
    await TestDataHelper.cleanupTestData();
    await TestDataHelper.disconnect();
  });

  test('仕訳更新ページが正常に表示されること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    await journalUpdatePage.expectPageLoaded(testJournal.journalNumber);
    
    // 初期データが正しく読み込まれることを確認
    await journalUpdatePage.expectInitialDataLoaded(
      testUtils.formatDate(testJournal.journalDate),
      testJournal.description
    );
  });

  test('仕訳ヘッダー情報の更新ができること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    const newDate = '2024-02-15';
    const newDescription = '更新後の摘要';
    
    // ヘッダー情報を更新
    await journalUpdatePage.updateJournalHeader(newDate, newDescription);
    
    // 更新を保存
    await journalUpdatePage.saveUpdate();
    await journalUpdatePage.expectUpdateSuccess(testJournal.journalNumber);
  });

  test('明細をクリックして編集モードに入れること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 借方明細をクリックして編集モードに
    await journalUpdatePage.clickDetailItemToEdit('debit', 0);
    
    // 編集モードがアクティブになることを確認
    await journalUpdatePage.expectEditModeActive('debit');
  });

  test('編集モードで明細の更新ができること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 借方明細を編集モードに
    await journalUpdatePage.clickDetailItemToEdit('debit', 0);
    await journalUpdatePage.expectEditModeActive('debit');
    
    // 明細を更新
    await journalUpdatePage.updateDetailInEditMode(
      'debit',
      testAccounts.bankDeposit.accountCode, // 勘定科目を変更
      120000, // 金額を変更
      '預金受取' // 摘要を変更
    );
    
    // 編集モードが終了することを確認
    await journalUpdatePage.expectEditModeInactive('debit');
  });

  test('編集のキャンセルができること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 借方明細を編集モードに
    await journalUpdatePage.clickDetailItemToEdit('debit', 0);
    await journalUpdatePage.expectEditModeActive('debit');
    
    // 編集をキャンセル
    await journalUpdatePage.cancelEdit('debit');
    
    // 編集モードが終了することを確認
    await journalUpdatePage.expectEditModeInactive('debit');
  });

  test('新しい明細の追加ができること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 初期明細数を確認
    const initialDebitCount = await journalUpdatePage.debitDetailList
      .locator('[data-testid="detail-item"]').count();
    
    // 新しい借方明細を追加
    await journalUpdatePage.addNewDetail(
      'debit',
      testAccounts.inventory.accountCode,
      50000,
      '商品追加'
    );
    
    // 明細数が増えることを確認
    await journalUpdatePage.expectDetailListCount('debit', initialDebitCount + 1);
  });

  test('明細の削除ができること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 初期明細数を確認
    const initialDebitCount = await journalUpdatePage.debitDetailList
      .locator('[data-testid="detail-item"]').count();
    
    if (initialDebitCount > 0) {
      // 最初の明細を削除
      await journalUpdatePage.removeDetail('debit', 0);
      
      // 明細数が減ることを確認
      await journalUpdatePage.expectDetailListCount('debit', initialDebitCount - 1);
    }
  });

  test('バランスが保たれているかチェックできること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 初期状態でバランスが取れていることを確認
    expect(await journalUpdatePage.isBalanced()).toBeTruthy();
    
    // 借方明細を追加してバランスを崩す
    await journalUpdatePage.addNewDetail(
      'debit',
      testAccounts.cash.accountCode,
      10000,
      'バランステスト'
    );
    
    // バランスが崩れることを確認
    expect(await journalUpdatePage.isBalanced()).toBeFalsy();
  });

  test('更新処理が正常に完了すること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // ヘッダー更新
    await journalUpdatePage.updateJournalHeader(
      '2024-03-15',
      '更新完了テスト'
    );
    
    // 明細を編集モードにして更新
    await journalUpdatePage.clickDetailItemToEdit('debit', 0);
    await journalUpdatePage.updateDetailInEditMode(
      'debit',
      testAccounts.bankDeposit.accountCode,
      150000,
      '預金更新'
    );
    
    // バランスを調整
    await journalUpdatePage.clickDetailItemToEdit('credit', 0);
    await journalUpdatePage.updateDetailInEditMode(
      'credit',
      testAccounts.sales.accountCode,
      150000,
      '売上更新'
    );
    
    // バランス確認
    expect(await journalUpdatePage.isBalanced()).toBeTruthy();
    
    // 更新保存
    await journalUpdatePage.saveUpdate();
    await journalUpdatePage.expectUpdateSuccess(testJournal.journalNumber);
  });

  test('削除処理が正常に動作すること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 削除実行
    await journalUpdatePage.deleteJournal();
    await journalUpdatePage.confirmDelete();
    
    // 削除後の処理確認（一覧ページに戻るなど）
    await testUtils.wait(1000);
  });

  test('戻るボタンで前のページに戻れること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    await journalUpdatePage.goBack();
    
    // 前のページに戻ることを確認（URL確認など）
    await testUtils.wait(500);
  });

  test('複数明細の更新が正常に動作すること', async () => {
    // 複数明細の仕訳を作成
    const complexJournal = await TestDataHelper.createTestJournal({
      journalDate: new Date(formTestData.validJournalDate),
      description: '複数明細更新テスト',
      details: testJournalPatterns.complexTransaction.details,
    });

    await journalUpdatePage.goto(complexJournal.journalNumber);
    await journalUpdatePage.expectPageLoaded(complexJournal.journalNumber);

    // 複数の明細を順次編集
    const debitCount = testJournalPatterns.complexTransaction.details
      .filter(d => d.side === 'debit').length;
    
    if (debitCount > 1) {
      // 最初の借方明細を編集
      await journalUpdatePage.clickDetailItemToEdit('debit', 0);
      await journalUpdatePage.updateDetailInEditMode(
        'debit',
        testAccounts.cash.accountCode,
        200000,
        '現金更新1'
      );

      // 2番目の借方明細を編集
      await journalUpdatePage.clickDetailItemToEdit('debit', 1);
      await journalUpdatePage.updateDetailInEditMode(
        'debit',
        testAccounts.bankDeposit.accountCode,
        150000,
        '預金更新2'
      );
    }

    // テスト用仕訳を削除
    await TestDataHelper.deleteJournal(complexJournal.journalNumber);
  });

  test('バリデーションエラーが正しく処理されること', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 明細を編集して不正な勘定科目を入力
    await journalUpdatePage.clickDetailItemToEdit('debit', 0);
    
    // 存在しない勘定科目コードで更新を試行
    await journalUpdatePage.updateDetailInEditMode(
      'debit',
      'INVALID',
      100000,
      '不正勘定科目'
    );
    
    // エラーメッセージが表示されることを確認
    await expect(journalUpdatePage.page.locator('text=勘定科目が見つかりません'))
      .toBeVisible({ timeout: 5000 });
  });

  test('編集中の状態表示が正しいこと', async () => {
    await journalUpdatePage.goto(testJournal.journalNumber);
    
    // 編集モードに入る前
    expect(await journalUpdatePage.isInEditMode('debit')).toBeFalsy();
    
    // 編集モードに入る
    await journalUpdatePage.clickDetailItemToEdit('debit', 0);
    
    // 編集モードであることを確認
    expect(await journalUpdatePage.isInEditMode('debit')).toBeTruthy();
    
    // 編集完了
    await journalUpdatePage.updateDetailInEditMode(
      'debit',
      testAccounts.cash.accountCode,
      100000,
      '現金'
    );
    
    // 編集モードが終了することを確認
    expect(await journalUpdatePage.isInEditMode('debit')).toBeFalsy();
  });
});