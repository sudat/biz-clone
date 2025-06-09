/**
 * 勘定科目Service インターフェース
 * ============================================================================
 * 勘定科目のビジネスロジック層インターフェース定義
 * ============================================================================
 */

import { 
  Account, 
  AccountCreateDto, 
  AccountUpdateDto,
  SubAccount 
} from '../../repositories/interfaces/IAccountRepository';
import { PaginationOptions, PaginatedResult } from '../../repositories/interfaces/IRepository';

export interface CreateAccountWithSubAccountsDto {
  account: AccountCreateDto;
  subAccounts?: Array<{
    subAccountCode: string;
    subAccountName: string;
    subAccountNameKana?: string;
    isActive: boolean;
    sortOrder: number;
    notes?: string;
  }>;
}

export interface AccountSearchOptions {
  accountType?: Account['accountType'];
  isActive?: boolean;
  includeSubAccounts?: boolean;
  includeChildren?: boolean;
}

export interface AccountHierarchyNode extends Account {
  children: AccountHierarchyNode[];
  level: number;
  hasSubAccounts: boolean;
}

/**
 * 勘定科目Service インターフェース
 */
export interface IAccountService {
  // 基本CRUD操作
  getAccount(accountCode: string): Promise<Account | null>;
  getAccountWithSubAccounts(accountCode: string): Promise<Account | null>;
  getAllAccounts(options?: AccountSearchOptions): Promise<Account[]>;
  getAccountsPaginated(
    pagination: PaginationOptions,
    options?: AccountSearchOptions
  ): Promise<PaginatedResult<Account>>;
  
  createAccount(accountData: AccountCreateDto): Promise<Account>;
  createAccountWithSubAccounts(data: CreateAccountWithSubAccountsDto): Promise<Account>;
  updateAccount(accountCode: string, accountData: AccountUpdateDto): Promise<Account>;
  deleteAccount(accountCode: string): Promise<void>;
  
  // 検索機能
  searchAccounts(
    query: string,
    pagination?: PaginationOptions,
    options?: AccountSearchOptions
  ): Promise<PaginatedResult<Account>>;
  
  // 階層構造管理
  getAccountHierarchy(): Promise<AccountHierarchyNode[]>;
  moveAccountToParent(accountCode: string, newParentCode: string | null): Promise<Account>;
  reorderAccounts(updates: Array<{ accountCode: string; sortOrder: number }>): Promise<void>;
  
  // 勘定科目タイプ別取得
  getAccountsByType(accountType: Account['accountType']): Promise<Account[]>;
  getDetailAccounts(): Promise<Account[]>;
  getActiveAccounts(): Promise<Account[]>;
  
  // バリデーション
  validateAccountCode(accountCode: string): Promise<{ isValid: boolean; message?: string }>;
  canDeleteAccount(accountCode: string): Promise<{ canDelete: boolean; reason?: string }>;
  
  // 統計・分析
  getAccountUsageReport(accountCode: string): Promise<{
    account: Account;
    journalEntryCount: number;
    lastUsedDate: Date | null;
    totalAmount: number;
    subAccountsCount: number;
    childAccountsCount: number;
  }>;
  
  getAccountTypesSummary(): Promise<Array<{
    accountType: Account['accountType'];
    totalCount: number;
    activeCount: number;
    detailCount: number;
  }>>;
  
  // インポート・エクスポート
  bulkCreateAccounts(accounts: AccountCreateDto[]): Promise<Account[]>;
  exportAccountsToCSV(options?: AccountSearchOptions): Promise<string>;
  validateAccountsImport(csvData: string): Promise<{
    valid: AccountCreateDto[];
    invalid: Array<{ row: number; data: any; errors: string[] }>;
  }>;
  
  // 補助科目管理
  createSubAccount(
    accountCode: string,
    subAccountData: {
      subAccountCode: string;
      subAccountName: string;
      subAccountNameKana?: string;
      isActive: boolean;
      sortOrder: number;
      notes?: string;
    }
  ): Promise<SubAccount>;
  
  updateSubAccount(
    subAccountCode: string,
    subAccountData: Partial<{
      subAccountName: string;
      subAccountNameKana: string;
      isActive: boolean;
      sortOrder: number;
      notes: string;
    }>
  ): Promise<SubAccount>;
  
  deleteSubAccount(subAccountCode: string): Promise<void>;
  getSubAccounts(accountCode: string): Promise<SubAccount[]>;
}