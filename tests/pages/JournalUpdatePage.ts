import { Page, Locator, expect } from '@playwright/test';

export class JournalUpdatePage {
  readonly page: Page;
  
  // ヘッダー要素
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  readonly journalNumberBadge: Locator;
  
  // 仕訳ヘッダー
  readonly journalDateInput: Locator;
  readonly descriptionInput: Locator;
  
  // 借方明細エリア
  readonly debitDetailSection: Locator;
  readonly debitAccountCodeInput: Locator;
  readonly debitAmountInput: Locator;
  readonly debitUpdateButton: Locator;
  readonly debitCancelButton: Locator;
  readonly debitAddButton: Locator;
  
  // 貸方明細エリア
  readonly creditDetailSection: Locator;
  readonly creditAccountCodeInput: Locator;
  readonly creditAmountInput: Locator;
  readonly creditUpdateButton: Locator;
  readonly creditCancelButton: Locator;
  readonly creditAddButton: Locator;
  
  // 明細一覧
  readonly debitDetailList: Locator;
  readonly creditDetailList: Locator;
  
  // バランスモニター
  readonly balanceMonitor: Locator;
  readonly debitTotal: Locator;
  readonly creditTotal: Locator;
  readonly updateButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // ヘッダー要素
    this.pageTitle = page.locator('h1', { hasText: '仕訳更新' });
    this.backButton = page.locator('button', { hasText: '戻る' });
    this.journalNumberBadge = page.locator('[data-testid="journal-number-badge"]');
    
    // 仕訳ヘッダー
    this.journalDateInput = page.locator('input[name="header.journalDate"]');
    this.descriptionInput = page.locator('input[name="header.description"]');
    
    // 借方明細エリア
    this.debitDetailSection = page.locator('[data-testid="debit-detail-section"]');
    this.debitAccountCodeInput = this.debitDetailSection.locator('input').first();
    this.debitAmountInput = this.debitDetailSection.locator('input[type="number"]');
    this.debitUpdateButton = this.debitDetailSection.locator('button', { hasText: '更新' });
    this.debitCancelButton = this.debitDetailSection.locator('button', { hasText: 'キャンセル' });
    this.debitAddButton = this.debitDetailSection.locator('button', { hasText: '追加' });
    
    // 貸方明細エリア
    this.creditDetailSection = page.locator('[data-testid="credit-detail-section"]');
    this.creditAccountCodeInput = this.creditDetailSection.locator('input').first();
    this.creditAmountInput = this.creditDetailSection.locator('input[type="number"]');
    this.creditUpdateButton = this.creditDetailSection.locator('button', { hasText: '更新' });
    this.creditCancelButton = this.creditDetailSection.locator('button', { hasText: 'キャンセル' });
    this.creditAddButton = this.creditDetailSection.locator('button', { hasText: '追加' });
    
    // 明細一覧
    this.debitDetailList = page.locator('[data-testid="debit-detail-list"]');
    this.creditDetailList = page.locator('[data-testid="credit-detail-list"]');
    
    // バランスモニター
    this.balanceMonitor = page.locator('[data-testid="balance-monitor"]');
    this.debitTotal = this.balanceMonitor.locator('[data-testid="debit-total"]');
    this.creditTotal = this.balanceMonitor.locator('[data-testid="credit-total"]');
    this.updateButton = this.balanceMonitor.locator('button', { hasText: '更新' });
    this.deleteButton = this.balanceMonitor.locator('button', { hasText: '削除' });
  }

  async goto(journalNumber: string) {
    await this.page.goto(`/siwake/update/${journalNumber}`);
    await expect(this.pageTitle).toBeVisible();
  }

  async updateJournalHeader(date?: string, description?: string) {
    if (date) {
      await this.journalDateInput.fill(date);
    }
    if (description !== undefined) {
      await this.descriptionInput.fill(description);
    }
  }

  async clickDetailItemToEdit(type: 'debit' | 'credit', index: number) {
    const detailList = type === 'debit' ? this.debitDetailList : this.creditDetailList;
    const detailItem = detailList.locator('[data-testid="detail-item"]').nth(index);
    await detailItem.click();
  }

  async updateDetailInEditMode(type: 'debit' | 'credit', accountCode?: string, amount?: number, description?: string) {
    const section = type === 'debit' ? this.debitDetailSection : this.creditDetailSection;
    const updateButton = type === 'debit' ? this.debitUpdateButton : this.creditUpdateButton;
    
    if (accountCode) {
      const accountInput = section.locator('input').first();
      await accountInput.fill(accountCode);
      await this.page.keyboard.press('Tab'); // 勘定科目名を取得
    }
    
    if (amount !== undefined) {
      const amountInput = section.locator('input[type="number"]');
      await amountInput.fill(amount.toString());
    }
    
    if (description !== undefined) {
      const descriptionInput = section.locator('input[placeholder*="摘要"]');
      await descriptionInput.fill(description);
    }
    
    await updateButton.click();
  }

  async cancelEdit(type: 'debit' | 'credit') {
    const cancelButton = type === 'debit' ? this.debitCancelButton : this.creditCancelButton;
    await cancelButton.click();
  }

  async addNewDetail(type: 'debit' | 'credit', accountCode: string, amount: number, description?: string) {
    const section = type === 'debit' ? this.debitDetailSection : this.creditDetailSection;
    const addButton = type === 'debit' ? this.debitAddButton : this.creditAddButton;
    
    // 勘定科目コード入力
    const accountInput = section.locator('input').first();
    await accountInput.fill(accountCode);
    await this.page.keyboard.press('Tab'); // 勘定科目名を取得
    
    // 金額入力
    const amountInput = section.locator('input[type="number"]');
    await amountInput.fill(amount.toString());
    
    // 摘要入力（オプション）
    if (description) {
      const descriptionInput = section.locator('input[placeholder*="摘要"]');
      await descriptionInput.fill(description);
    }
    
    // 追加ボタンクリック
    await addButton.click();
  }

  async removeDetail(type: 'debit' | 'credit', index: number) {
    const detailList = type === 'debit' ? this.debitDetailList : this.creditDetailList;
    const removeButton = detailList
      .locator('[data-testid="detail-item"]')
      .nth(index)
      .locator('button[title="削除"]');
    await removeButton.click();
  }

  async saveUpdate() {
    await this.updateButton.click();
  }

  async deleteJournal() {
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

  async isInEditMode(type: 'debit' | 'credit'): Promise<boolean> {
    const updateButton = type === 'debit' ? this.debitUpdateButton : this.creditUpdateButton;
    return await updateButton.isVisible();
  }

  async expectPageLoaded(journalNumber: string) {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.journalNumberBadge).toBeVisible();
    await expect(this.balanceMonitor).toBeVisible();
  }

  async expectInitialDataLoaded(date: string, description?: string) {
    await expect(this.journalDateInput).toHaveValue(date);
    if (description) {
      await expect(this.descriptionInput).toHaveValue(description);
    }
  }

  async expectEditModeActive(type: 'debit' | 'credit') {
    const updateButton = type === 'debit' ? this.debitUpdateButton : this.creditUpdateButton;
    const cancelButton = type === 'debit' ? this.debitCancelButton : this.creditCancelButton;
    
    await expect(updateButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
  }

  async expectEditModeInactive(type: 'debit' | 'credit') {
    const addButton = type === 'debit' ? this.debitAddButton : this.creditAddButton;
    await expect(addButton).toBeVisible();
  }

  async expectUpdateSuccess(journalNumber: string) {
    // 更新成功後は照会ページにリダイレクトされることを確認
    await expect(this.page).toHaveURL(`/siwake/${journalNumber}`);
  }

  async expectDetailListCount(type: 'debit' | 'credit', count: number) {
    const detailList = type === 'debit' ? this.debitDetailList : this.creditDetailList;
    await expect(detailList.locator('[data-testid="detail-item"]')).toHaveCount(count);
  }
}