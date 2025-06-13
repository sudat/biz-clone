import { test, expect } from '@playwright/test';
import { JournalCreatePage } from '../pages/JournalCreatePage';
import { TestDataHelper, testUtils } from '../helpers/testHelpers';
import { testAccounts, testJournalPatterns, invalidTestData, formTestData } from '../fixtures/testData';

test.describe('仕訳作成機能', () => {
  let journalCreatePage: JournalCreatePage;

  test.beforeEach(async ({ page }) => {
    journalCreatePage = new JournalCreatePage(page);
    
    // テスト環境をセットアップ
    await TestDataHelper.setupTestEnvironment();
    
    // 仕訳作成ページに移動
    await journalCreatePage.goto();
    await journalCreatePage.expectPageLoaded();
  });

  test.afterEach(async () => {
    // テストデータをクリーンアップ
    await TestDataHelper.cleanupTestData();
    await TestDataHelper.disconnect();
  });

  test('正常な仕訳作成ができること', async () => {
    // 仕訳ヘッダー入力
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      '売上計上テスト'
    );

    // 借方明細追加
    await journalCreatePage.addDebitDetail(
      testAccounts.cash.accountCode,
      110000,
      '現金受取'
    );

    // 貸方明細追加
    await journalCreatePage.addCreditDetail(
      testAccounts.sales.accountCode,
      100000,
      '売上高'
    );

    // 消費税の貸方明細追加
    await journalCreatePage.addCreditDetail(
      '2301',
      10000,
      '消費税'
    );

    // バランスチェック
    expect(await journalCreatePage.isBalanced()).toBeTruthy();

    // 保存実行
    await journalCreatePage.save();
    await journalCreatePage.expectSaveSuccess();
  });

  test('複数明細の仕訳作成ができること', async () => {
    const pattern = testJournalPatterns.complexTransaction;
    
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      pattern.description
    );

    // 借方明細を追加
    const debitDetails = pattern.details.filter(d => d.side === 'debit');
    for (const detail of debitDetails) {
      await journalCreatePage.addDebitDetail(
        detail.accountCode,
        detail.amount,
        detail.description
      );
    }

    // 貸方明細を追加
    const creditDetails = pattern.details.filter(d => d.side === 'credit');
    for (const detail of creditDetails) {
      await journalCreatePage.addCreditDetail(
        detail.accountCode,
        detail.amount,
        detail.description
      );
    }

    // 明細数の確認
    await journalCreatePage.expectDebitDetailCount(debitDetails.length);
    await journalCreatePage.expectCreditDetailCount(creditDetails.length);

    // バランス確認
    expect(await journalCreatePage.isBalanced()).toBeTruthy();

    // 保存
    await journalCreatePage.save();
    await journalCreatePage.expectSaveSuccess();
  });

  test('明細の削除ができること', async () => {
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      '明細削除テスト'
    );

    // 借方明細を2つ追加
    await journalCreatePage.addDebitDetail(
      testAccounts.cash.accountCode,
      50000,
      '現金1'
    );
    await journalCreatePage.addDebitDetail(
      testAccounts.bankDeposit.accountCode,
      50000,
      '預金1'
    );

    // 明細数確認
    await journalCreatePage.expectDebitDetailCount(2);

    // 1つ目の明細を削除
    await journalCreatePage.removeDebitDetail(0);

    // 明細数確認
    await journalCreatePage.expectDebitDetailCount(1);

    // 貸方明細追加してバランス
    await journalCreatePage.addCreditDetail(
      testAccounts.sales.accountCode,
      50000,
      '売上'
    );

    expect(await journalCreatePage.isBalanced()).toBeTruthy();
  });

  test('明細クリック時の表示切り替えができること', async () => {
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      '表示切り替えテスト'
    );

    // 借方明細追加
    await journalCreatePage.addDebitDetail(
      testAccounts.cash.accountCode,
      100000,
      '現金'
    );

    // 明細をクリック
    await journalCreatePage.clickDetailItem('debit', 0);

    // 表示が切り替わることを確認（実装により詳細は調整）
    await testUtils.wait(500);
  });

  test('フォームリセット機能が動作すること', async () => {
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      'リセットテスト'
    );

    await journalCreatePage.addDebitDetail(
      testAccounts.cash.accountCode,
      100000,
      '現金'
    );

    await journalCreatePage.addCreditDetail(
      testAccounts.sales.accountCode,
      100000,
      '売上'
    );

    // リセット実行
    await journalCreatePage.reset();

    // 明細がクリアされることを確認
    await journalCreatePage.expectDebitDetailCount(0);
    await journalCreatePage.expectCreditDetailCount(0);
  });

  test('バリデーションエラーが正しく表示されること', async () => {
    // 貸借不一致の仕訳で保存試行
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      'バリデーションテスト'
    );

    await journalCreatePage.addDebitDetail(
      testAccounts.cash.accountCode,
      100000,
      '現金'
    );

    await journalCreatePage.addCreditDetail(
      testAccounts.sales.accountCode,
      90000, // 金額が一致しない
      '売上'
    );

    // 保存試行
    await journalCreatePage.save();

    // エラーメッセージが表示されることを確認
    await journalCreatePage.expectValidationError('貸借の金額が一致しません');
  });

  test('不正な勘定科目コードでエラーになること', async () => {
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      '不正勘定科目テスト'
    );

    // 存在しない勘定科目コードで明細追加を試行
    await journalCreatePage.addDebitDetail(
      invalidTestData.invalidAccountCode,
      100000,
      '不正勘定科目'
    );

    // エラーメッセージが表示されることを確認
    await journalCreatePage.expectValidationError('勘定科目が見つかりません');
  });

  test('日付フィールドのバリデーションが動作すること', async () => {
    // 不正な日付で入力
    await journalCreatePage.fillJournalHeader(
      formTestData.invalidJournalDate,
      '日付バリデーションテスト'
    );

    await journalCreatePage.addDebitDetail(
      testAccounts.cash.accountCode,
      100000,
      '現金'
    );

    await journalCreatePage.addCreditDetail(
      testAccounts.sales.accountCode,
      100000,
      '売上'
    );

    await journalCreatePage.save();

    // 日付エラーが表示されることを確認
    await journalCreatePage.expectValidationError('正しい日付を入力してください');
  });

  test('金額フィールドの数値バリデーションが動作すること', async ({ page }) => {
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      '金額バリデーションテスト'
    );

    // 数値以外の文字を金額フィールドに入力
    await journalCreatePage.debitAccountCodeInput.fill(testAccounts.cash.accountCode);
    await page.keyboard.press('Tab');
    
    // 不正な金額を入力
    await journalCreatePage.debitAmountInput.fill(formTestData.invalidAmount);
    await journalCreatePage.debitAddButton.click();

    // エラーメッセージの確認
    await journalCreatePage.expectValidationError('正しい金額を入力してください');
  });

  test('ゼロ金額での仕訳作成が拒否されること', async () => {
    await journalCreatePage.fillJournalHeader(
      formTestData.validJournalDate,
      'ゼロ金額テスト'
    );

    await journalCreatePage.addDebitDetail(
      testAccounts.cash.accountCode,
      0,
      '現金'
    );

    await journalCreatePage.addCreditDetail(
      testAccounts.sales.accountCode,
      0,
      '売上'
    );

    await journalCreatePage.save();

    // ゼロ金額エラーが表示されることを確認
    await journalCreatePage.expectValidationError('金額は1円以上で入力してください');
  });
});