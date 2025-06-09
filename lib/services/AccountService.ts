/**
 * 勘定科目Service 実装クラス
 * ============================================================================
 * 勘定科目のビジネスロジック層実装
 * ============================================================================
 */

import { 
  IAccountService, 
  CreateAccountWithSubAccountsDto,
  AccountSearchOptions,
  AccountHierarchyNode
} from './interfaces/IAccountService';
import { 
  IAccountRepository,
  Account, 
  AccountCreateDto, 
  AccountUpdateDto,
  SubAccount 
} from '../repositories/interfaces/IAccountRepository';
import { PaginationOptions, PaginatedResult } from '../repositories/interfaces/IRepository';

export class AccountService implements IAccountService {
  constructor(private accountRepository: IAccountRepository) {}

  async getAccount(accountCode: string): Promise<Account | null> {
    return await this.accountRepository.findById(accountCode);
  }

  async getAccountWithSubAccounts(accountCode: string): Promise<Account | null> {
    return await this.accountRepository.findWithSubAccounts(accountCode);
  }

  async getAllAccounts(options?: AccountSearchOptions): Promise<Account[]> {
    const filter = this.buildFilterFromOptions(options);
    return await this.accountRepository.findAll(filter);
  }

  async getAccountsPaginated(
    pagination: PaginationOptions,
    options?: AccountSearchOptions
  ): Promise<PaginatedResult<Account>> {
    const filter = this.buildFilterFromOptions(options);
    return await this.accountRepository.findPaginated(pagination, filter);
  }

  async createAccount(accountData: AccountCreateDto): Promise<Account> {
    // ビジネスルールの検証
    await this.validateAccountBusinessRules(accountData);
    
    return await this.accountRepository.create(accountData);
  }

  async createAccountWithSubAccounts(data: CreateAccountWithSubAccountsDto): Promise<Account> {
    // ビジネスルールの検証
    await this.validateAccountBusinessRules(data.account);
    
    if (data.subAccounts) {
      for (const subAccount of data.subAccounts) {
        await this.validateSubAccountBusinessRules(subAccount, data.account.accountCode);
      }
    }

    return await this.accountRepository.withTransaction(async (repo) => {
      // 勘定科目作成
      const account = await repo.create(data.account);
      
      // 補助科目作成
      if (data.subAccounts && data.subAccounts.length > 0) {
        // 補助科目は別のRepositoryで管理する予定のため、現在はスキップ
        // 実装時には SubAccountRepository を使用
      }
      
      return account;
    });
  }

  async updateAccount(accountCode: string, accountData: AccountUpdateDto): Promise<Account> {
    // 存在確認
    const existing = await this.accountRepository.findById(accountCode);
    if (!existing) {
      throw new Error(`Account with code ${accountCode} not found`);
    }

    // ビジネスルールの検証
    if (accountData.parentAccountCode !== undefined) {
      await this.validateParentAccountChange(accountCode, accountData.parentAccountCode);
    }

    return await this.accountRepository.update(accountCode, accountData);
  }

  async deleteAccount(accountCode: string): Promise<void> {
    const canDelete = await this.canDeleteAccount(accountCode);
    if (!canDelete.canDelete) {
      throw new Error(`Cannot delete account: ${canDelete.reason}`);
    }

    await this.accountRepository.delete(accountCode);
  }

  async searchAccounts(
    query: string,
    pagination?: PaginationOptions,
    options?: AccountSearchOptions
  ): Promise<PaginatedResult<Account>> {
    const searchFields: Array<keyof Account> = [
      'accountCode',
      'accountName',
      'accountNameKana'
    ];

    const filter = this.buildFilterFromOptions(options);

    if (pagination) {
      return await this.accountRepository.searchPaginated(query, searchFields, pagination, filter);
    } else {
      const results = await this.accountRepository.search(query, searchFields, filter);
      return {
        data: results,
        total: results.length,
        page: 1,
        limit: results.length,
        totalPages: 1
      };
    }
  }

  async getAccountHierarchy(): Promise<AccountHierarchyNode[]> {
    const accounts = await this.accountRepository.getAccountHierarchy();
    return this.buildHierarchyNodes(accounts, 0);
  }

  async moveAccountToParent(accountCode: string, newParentCode: string | null): Promise<Account> {
    await this.validateParentAccountChange(accountCode, newParentCode);
    return await this.accountRepository.moveAccount(accountCode, newParentCode);
  }

  async reorderAccounts(updates: Array<{ accountCode: string; sortOrder: number }>): Promise<void> {
    // ソート順の重複チェック
    const sortOrders = updates.map(u => u.sortOrder);
    const duplicates = sortOrders.filter((order, index) => sortOrders.indexOf(order) !== index);
    
    if (duplicates.length > 0) {
      throw new Error(`Duplicate sort orders found: ${duplicates.join(', ')}`);
    }

    await this.accountRepository.updateSortOrder(updates);
  }

  async getAccountsByType(accountType: Account['accountType']): Promise<Account[]> {
    return await this.accountRepository.findByType(accountType);
  }

  async getDetailAccounts(): Promise<Account[]> {
    return await this.accountRepository.findDetailAccounts();
  }

  async getActiveAccounts(): Promise<Account[]> {
    return await this.accountRepository.findActiveAccounts();
  }

  async validateAccountCode(accountCode: string): Promise<{ isValid: boolean; message?: string }> {
    // 形式チェック
    const codePattern = /^[A-Z0-9]{3,10}$/;
    if (!codePattern.test(accountCode)) {
      return {
        isValid: false,
        message: '勘定科目コードは3-10文字の英数字で入力してください'
      };
    }

    // 重複チェック
    const isValid = await this.accountRepository.isValidAccountCode(accountCode);
    if (!isValid) {
      return {
        isValid: false,
        message: 'この勘定科目コードは既に使用されています'
      };
    }

    return { isValid: true };
  }

  async canDeleteAccount(accountCode: string): Promise<{ canDelete: boolean; reason?: string }> {
    const canDelete = await this.accountRepository.canDeleteAccount(accountCode);
    
    if (!canDelete) {
      return {
        canDelete: false,
        reason: '子勘定科目、補助科目、または仕訳で使用されているため削除できません'
      };
    }

    return { canDelete: true };
  }

  async getAccountUsageReport(accountCode: string): Promise<{
    account: Account;
    journalEntryCount: number;
    lastUsedDate: Date | null;
    totalAmount: number;
    subAccountsCount: number;
    childAccountsCount: number;
  }> {
    const [account, usageStats, subAccounts, childAccounts] = await Promise.all([
      this.accountRepository.findById(accountCode),
      this.accountRepository.getAccountUsageStats(accountCode),
      this.getSubAccounts(accountCode),
      this.accountRepository.findByParent(accountCode)
    ]);

    if (!account) {
      throw new Error(`Account with code ${accountCode} not found`);
    }

    // 仕訳金額の集計は JournalRepository で実装予定
    const totalAmount = 0; // TODO: 実装

    return {
      account,
      journalEntryCount: usageStats.journalEntryCount,
      lastUsedDate: usageStats.lastUsedDate,
      totalAmount,
      subAccountsCount: subAccounts.length,
      childAccountsCount: childAccounts.length
    };
  }

  async getAccountTypesSummary(): Promise<Array<{
    accountType: Account['accountType'];
    totalCount: number;
    activeCount: number;
    detailCount: number;
  }>> {
    const accountTypes: Account['accountType'][] = ['資産', '負債', '資本', '収益', '費用'];
    const summary = [];

    for (const accountType of accountTypes) {
      const [allAccounts, activeAccounts, detailAccounts] = await Promise.all([
        this.accountRepository.findByType(accountType),
        this.accountRepository.findAll({
          where: { accountType, isActive: true }
        }),
        this.accountRepository.findAll({
          where: { accountType, isDetail: true }
        })
      ]);

      summary.push({
        accountType,
        totalCount: allAccounts.length,
        activeCount: activeAccounts.length,
        detailCount: detailAccounts.length
      });
    }

    return summary;
  }

  async bulkCreateAccounts(accounts: AccountCreateDto[]): Promise<Account[]> {
    // 各勘定科目のビジネスルール検証
    for (const account of accounts) {
      await this.validateAccountBusinessRules(account);
    }

    return await this.accountRepository.bulkCreate(accounts);
  }

  async exportAccountsToCSV(options?: AccountSearchOptions): Promise<string> {
    const accounts = await this.getAllAccounts(options);
    
    // CSVヘッダー
    const headers = [
      '勘定科目コード',
      '勘定科目名',
      '勘定科目名カナ',
      '勘定科目タイプ',
      '親勘定科目コード',
      '詳細区分',
      '有効区分',
      '並び順',
      '備考',
      '作成日',
      '更新日'
    ];

    // CSVデータ
    const csvData = accounts.map(account => [
      account.accountCode,
      account.accountName,
      account.accountNameKana || '',
      account.accountType,
      account.parentAccountCode || '',
      account.isDetail ? '1' : '0',
      account.isActive ? '1' : '0',
      account.sortOrder.toString(),
      account.notes || '',
      account.createdAt.toISOString(),
      account.updatedAt.toISOString()
    ]);

    // CSV文字列生成
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  async validateAccountsImport(csvData: string): Promise<{
    valid: AccountCreateDto[];
    invalid: Array<{ row: number; data: any; errors: string[] }>;
  }> {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    const valid: AccountCreateDto[] = [];
    const invalid: Array<{ row: number; data: any; errors: string[] }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const rowData = headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {} as any);

      const errors: string[] = [];
      
      try {
        const accountData: AccountCreateDto = {
          accountCode: rowData['勘定科目コード'],
          accountName: rowData['勘定科目名'],
          accountNameKana: rowData['勘定科目名カナ'] || undefined,
          accountType: rowData['勘定科目タイプ'] as Account['accountType'],
          parentAccountCode: rowData['親勘定科目コード'] || undefined,
          isDetail: rowData['詳細区分'] === '1',
          isActive: rowData['有効区分'] === '1',
          sortOrder: parseInt(rowData['並び順']) || 0,
          notes: rowData['備考'] || undefined
        };

        // バリデーション
        await this.validateAccountBusinessRules(accountData);
        valid.push(accountData);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : '不明なエラー');
        invalid.push({ row: i + 1, data: rowData, errors });
      }
    }

    return { valid, invalid };
  }

  async createSubAccount(
    accountCode: string,
    subAccountData: {
      subAccountCode: string;
      subAccountName: string;
      subAccountNameKana?: string;
      isActive: boolean;
      sortOrder: number;
      notes?: string;
    }
  ): Promise<SubAccount> {
    // TODO: SubAccountRepository を使用して実装
    throw new Error('SubAccount functionality not implemented yet');
  }

  async updateSubAccount(
    subAccountCode: string,
    subAccountData: Partial<{
      subAccountName: string;
      subAccountNameKana: string;
      isActive: boolean;
      sortOrder: number;
      notes: string;
    }>
  ): Promise<SubAccount> {
    // TODO: SubAccountRepository を使用して実装
    throw new Error('SubAccount functionality not implemented yet');
  }

  async deleteSubAccount(subAccountCode: string): Promise<void> {
    // TODO: SubAccountRepository を使用して実装
    throw new Error('SubAccount functionality not implemented yet');
  }

  async getSubAccounts(accountCode: string): Promise<SubAccount[]> {
    // TODO: SubAccountRepository を使用して実装
    return [];
  }

  // プライベートヘルパーメソッド
  private buildFilterFromOptions(options?: AccountSearchOptions) {
    if (!options) return undefined;

    const where: any = {};
    
    if (options.accountType) {
      where.accountType = options.accountType;
    }
    
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const include: string[] = [];
    if (options.includeSubAccounts) {
      include.push('subAccounts');
    }
    if (options.includeChildren) {
      include.push('childAccounts');
    }

    return {
      where: Object.keys(where).length > 0 ? where : undefined,
      include: include.length > 0 ? include : undefined
    };
  }

  private async validateAccountBusinessRules(accountData: AccountCreateDto): Promise<void> {
    // 勘定科目コードの検証
    const codeValidation = await this.validateAccountCode(accountData.accountCode);
    if (!codeValidation.isValid) {
      throw new Error(codeValidation.message);
    }

    // 親勘定科目の存在確認
    if (accountData.parentAccountCode) {
      const parentExists = await this.accountRepository.exists(accountData.parentAccountCode);
      if (!parentExists) {
        throw new Error(`Parent account ${accountData.parentAccountCode} does not exist`);
      }
    }

    // 勘定科目名の重複チェック（同一タイプ内）
    const existingByName = await this.accountRepository.findAll({
      where: {
        accountName: accountData.accountName,
        accountType: accountData.accountType
      }
    });

    if (existingByName.length > 0) {
      throw new Error('同一タイプ内で勘定科目名が重複しています');
    }
  }

  private async validateSubAccountBusinessRules(
    subAccountData: any,
    accountCode: string
  ): Promise<void> {
    // 補助科目コードの形式チェック
    const codePattern = /^[A-Z0-9]{3,15}$/;
    if (!codePattern.test(subAccountData.subAccountCode)) {
      throw new Error('補助科目コードは3-15文字の英数字で入力してください');
    }

    // TODO: 補助科目の重複チェック（SubAccountRepository実装後）
  }

  private async validateParentAccountChange(
    accountCode: string,
    newParentCode: string | null
  ): Promise<void> {
    if (newParentCode) {
      // 親勘定科目の存在確認
      const parentExists = await this.accountRepository.exists(newParentCode);
      if (!parentExists) {
        throw new Error(`Parent account ${newParentCode} does not exist`);
      }

      // 循環参照チェックは Repository で実行
    }
  }

  private buildHierarchyNodes(accounts: Account[], level: number): AccountHierarchyNode[] {
    return accounts.map(account => ({
      ...account,
      children: account.childAccounts 
        ? this.buildHierarchyNodes(account.childAccounts, level + 1)
        : [],
      level,
      hasSubAccounts: account.subAccounts ? account.subAccounts.length > 0 : false
    }));
  }
}