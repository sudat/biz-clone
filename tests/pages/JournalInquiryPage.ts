import { Page, Locator, expect } from '@playwright/test';

export class JournalInquiryPage {
  readonly page: Page;
  
  // ヘッダー要素
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  
  // 仕訳ヘッダー
  readonly journalNumber: Locator;
  readonly journalDate: Locator;
  readonly description: Locator;
  
  // 借方明細表示エリア
  readonly debitDetailDisplay: Locator;
  readonly debitAccountCode: Locator;
  readonly debitAccountName: Locator;
  readonly debitAmount: Locator;
  
  // 貸方明細表示エリア
  readonly creditDetailDisplay: Locator;
  readonly creditAccountCode: Locator;
  readonly creditAccountName: Locator;
  readonly creditAmount: Locator;
  
  // 明細一覧
  readonly debitDetailList: Locator;
  readonly creditDetailList: Locator;
  
  // アクションボタン
  readonly updateButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // ヘッダー要素
    this.pageTitle = page.locator('h1', { hasText: '仕訳照会' });
    this.backButton = page.locator('button', { hasText: '一覧に戻る' });
    
    // 仕訳ヘッダー - 実際のセレクタに合わせて調整が必要
    this.journalNumber = page.locator('[data-testid="journal-number"]');
    this.journalDate = page.locator('[data-testid="journal-date"]');
    this.description = page.locator('[data-testid="journal-description"]');
    
    // 借方明細表示エリア
    this.debitDetailDisplay = page.locator('[data-testid="debit-detail-display"]');
    this.debitAccountCode = this.debitDetailDisplay.locator('[data-testid="account-code"]');
    this.debitAccountName = this.debitDetailDisplay.locator('[data-testid="account-name"]');
    this.debitAmount = this.debitDetailDisplay.locator('[data-testid="amount"]');
    
    // 貸方明細表示エリア
    this.creditDetailDisplay = page.locator('[data-testid="credit-detail-display"]');
    this.creditAccountCode = this.creditDetailDisplay.locator('[data-testid="account-code"]');
    this.creditAccountName = this.creditDetailDisplay.locator('[data-testid="account-name"]');
    this.creditAmount = this.creditDetailDisplay.locator('[data-testid="amount"]');
    
    // 明細一覧
    this.debitDetailList = page.locator('[data-testid="debit-detail-list"]');
    this.creditDetailList = page.locator('[data-testid="credit-detail-list"]');
    
    // アクションボタン
    this.updateButton = page.locator('button', { hasText: '更新' });
    this.deleteButton = page.locator('button', { hasText: '削除' });
  }

  async goto(journalNumber: string) {
    await this.page.goto(`/siwake/${journalNumber}`);
    await expect(this.pageTitle).toBeVisible();
  }

  async clickDetailItem(type: 'debit' | 'credit', index: number) {
    const detailList = type === 'debit' ? this.debitDetailList : this.creditDetailList;
    const detailItem = detailList.locator('[data-testid="detail-item"]').nth(index);
    await detailItem.click();
  }

  async clickUpdateButton() {
    await this.updateButton.click();
  }

  async clickDeleteButton() {
    await this.deleteButton.click();
  }

  async confirmDelete() {
    // 削除確認ダイアログがある場合
    const confirmButton = this.page.locator('button', { hasText: '削除する' });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  async goBack() {
    await this.backButton.click();
  }

  async getJournalNumber(): Promise<string> {
    return await this.journalNumber.textContent() || '';
  }

  async getJournalDate(): Promise<string> {
    return await this.journalDate.textContent() || '';
  }

  async getDescription(): Promise<string> {
    return await this.description.textContent() || '';
  }

  async getDisplayedDetailInfo(type: 'debit' | 'credit') {
    const detailDisplay = type === 'debit' ? this.debitDetailDisplay : this.creditDetailDisplay;
    
    return {
      accountCode: await detailDisplay.locator('[data-testid="account-code"]').textContent() || '',
      accountName: await detailDisplay.locator('[data-testid="account-name"]').textContent() || '',
      amount: await detailDisplay.locator('[data-testid="amount"]').textContent() || ''
    };
  }

  async getDetailListCount(type: 'debit' | 'credit'): Promise<number> {
    const detailList = type === 'debit' ? this.debitDetailList : this.creditDetailList;
    return await detailList.locator('[data-testid="detail-item"]').count();
  }

  async expectPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.backButton).toBeVisible();
    await expect(this.updateButton).toBeVisible();
    await expect(this.deleteButton).toBeVisible();
  }

  async expectJournalInfo(journalNumber: string, date: string, description?: string) {
    await expect(this.journalNumber).toContainText(journalNumber);
    await expect(this.journalDate).toContainText(date);
    if (description) {
      await expect(this.description).toContainText(description);
    }
  }

  async expectDetailDisplayed(type: 'debit' | 'credit', accountCode: string, amount: string) {
    const detailDisplay = type === 'debit' ? this.debitDetailDisplay : this.creditDetailDisplay;
    await expect(detailDisplay.locator('[data-testid="account-code"]')).toContainText(accountCode);
    await expect(detailDisplay.locator('[data-testid="amount"]')).toContainText(amount);
  }

  async expectNavigationToUpdatePage(journalNumber: string) {
    await expect(this.page).toHaveURL(`/siwake/update/${journalNumber}`);
  }

  async expectNavigationToList() {
    await expect(this.page).toHaveURL('/siwake');
  }

  async expectDeleteSuccess() {
    // 削除成功後は一覧ページにリダイレクトされることを確認
    await expect(this.page).toHaveURL('/siwake');
    // 成功メッセージの確認（実装に依存）
    await expect(this.page.locator('text=削除しました')).toBeVisible({ timeout: 5000 });
  }
}