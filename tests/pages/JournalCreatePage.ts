import { Page, Locator, expect } from '@playwright/test';

export class JournalCreatePage {
  readonly page: Page;
  
  // ヘッダー要素
  readonly pageTitle: Locator;
  readonly journalNumberBadge: Locator;
  
  // 仕訳ヘッダー
  readonly journalDateInput: Locator;
  readonly descriptionInput: Locator;
  
  // 借方明細エリア
  readonly debitDetailSection: Locator;
  readonly debitAccountCodeInput: Locator;
  readonly debitAmountInput: Locator;
  readonly debitAddButton: Locator;
  
  // 貸方明細エリア
  readonly creditDetailSection: Locator;
  readonly creditAccountCodeInput: Locator;
  readonly creditAmountInput: Locator;
  readonly creditAddButton: Locator;
  
  // 明細一覧
  readonly debitDetailList: Locator;
  readonly creditDetailList: Locator;
  
  // バランスモニター
  readonly balanceMonitor: Locator;
  readonly debitTotal: Locator;
  readonly creditTotal: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // ヘッダー要素
    this.pageTitle = page.locator('h1', { hasText: '仕訳作成' });
    this.journalNumberBadge = page.locator('[data-testid="journal-number-badge"]');
    
    // 仕訳ヘッダー
    this.journalDateInput = page.locator('input[name="header.journalDate"]');
    this.descriptionInput = page.locator('input[name="header.description"]');
    
    // 借方明細エリア
    this.debitDetailSection = page.locator('[data-testid="debit-detail-section"]');
    this.debitAccountCodeInput = this.debitDetailSection.locator('input').first();
    this.debitAmountInput = this.debitDetailSection.locator('input[type="number"]');
    this.debitAddButton = this.debitDetailSection.locator('button', { hasText: '追加' });
    
    // 貸方明細エリア
    this.creditDetailSection = page.locator('[data-testid="credit-detail-section"]');
    this.creditAccountCodeInput = this.creditDetailSection.locator('input').first();
    this.creditAmountInput = this.creditDetailSection.locator('input[type="number"]');
    this.creditAddButton = this.creditDetailSection.locator('button', { hasText: '追加' });
    
    // 明細一覧
    this.debitDetailList = page.locator('[data-testid="debit-detail-list"]');
    this.creditDetailList = page.locator('[data-testid="credit-detail-list"]');
    
    // バランスモニター
    this.balanceMonitor = page.locator('[data-testid="balance-monitor"]');
    this.debitTotal = this.balanceMonitor.locator('[data-testid="debit-total"]');
    this.creditTotal = this.balanceMonitor.locator('[data-testid="credit-total"]');
    this.saveButton = this.balanceMonitor.locator('button', { hasText: '保存' });
    this.resetButton = this.balanceMonitor.locator('button', { hasText: 'リセット' });
  }

  async goto() {
    await this.page.goto('/siwake/new');
    await expect(this.pageTitle).toBeVisible();
  }

  async fillJournalHeader(date: string, description?: string) {
    await this.journalDateInput.fill(date);
    if (description) {
      await this.descriptionInput.fill(description);
    }
  }

  async addDebitDetail(accountCode: string, amount: number, description?: string) {
    // 勘定科目コード入力
    await this.debitAccountCodeInput.fill(accountCode);
    await this.page.keyboard.press('Tab'); // 勘定科目名を取得
    
    // 金額入力
    await this.debitAmountInput.fill(amount.toString());
    
    // 摘要入力（オプション）
    if (description) {
      const descriptionInput = this.debitDetailSection.locator('input[placeholder*="摘要"]');
      await descriptionInput.fill(description);
    }
    
    // 追加ボタンクリック
    await this.debitAddButton.click();
  }

  async addCreditDetail(accountCode: string, amount: number, description?: string) {
    // 勘定科目コード入力
    await this.creditAccountCodeInput.fill(accountCode);
    await this.page.keyboard.press('Tab'); // 勘定科目名を取得
    
    // 金額入力
    await this.creditAmountInput.fill(amount.toString());
    
    // 摘要入力（オプション）
    if (description) {
      const descriptionInput = this.creditDetailSection.locator('input[placeholder*="摘要"]');
      await descriptionInput.fill(description);
    }
    
    // 追加ボタンクリック
    await this.creditAddButton.click();
  }

  async removeDebitDetail(index: number) {
    const removeButton = this.debitDetailList
      .locator('[data-testid="detail-item"]')
      .nth(index)
      .locator('button[title="削除"]');
    await removeButton.click();
  }

  async removeCreditDetail(index: number) {
    const removeButton = this.creditDetailList
      .locator('[data-testid="detail-item"]')
      .nth(index)
      .locator('button[title="削除"]');
    await removeButton.click();
  }

  async clickDetailItem(type: 'debit' | 'credit', index: number) {
    const detailList = type === 'debit' ? this.debitDetailList : this.creditDetailList;
    const detailItem = detailList.locator('[data-testid="detail-item"]').nth(index);
    await detailItem.click();
  }

  async getDebitTotal(): Promise<string> {
    return await this.debitTotal.textContent() || '';
  }

  async getCreditTotal(): Promise<string> {
    return await this.creditTotal.textContent() || '';
  }

  async isBalanced(): Promise<boolean> {
    const debitTotal = await this.getDebitTotal();
    const creditTotal = await this.getCreditTotal();
    return debitTotal === creditTotal && debitTotal !== '¥0';
  }

  async save() {
    await this.saveButton.click();
  }

  async reset() {
    await this.resetButton.click();
  }

  async expectPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.journalDateInput).toBeVisible();
    await expect(this.debitDetailSection).toBeVisible();
    await expect(this.creditDetailSection).toBeVisible();
    await expect(this.balanceMonitor).toBeVisible();
  }

  async expectDebitDetailCount(count: number) {
    await expect(this.debitDetailList.locator('[data-testid="detail-item"]')).toHaveCount(count);
  }

  async expectCreditDetailCount(count: number) {
    await expect(this.creditDetailList.locator('[data-testid="detail-item"]')).toHaveCount(count);
  }

  async expectValidationError(message: string) {
    await expect(this.page.locator('text=' + message)).toBeVisible();
  }

  async expectSaveSuccess() {
    // 保存成功後は照会ページにリダイレクトされることを確認
    await expect(this.page).toHaveURL(/.*\/siwake\/\d+/);
  }
}