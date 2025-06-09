/**
 * 勘定科目Repository インターフェース
 * ============================================================================
 * 勘定科目データアクセス専用のインターフェース定義
 * ============================================================================
 */

import { ISearchableRepository, ITransactionalRepository } from './IRepository';

export interface AccountCreateDto {
  accountCode: string;
  accountName: string;
  accountNameKana?: string;
  accountType: '資産' | '負債' | '資本' | '収益' | '費用';
  parentAccountCode?: string;
  isDetail: boolean;
  isActive: boolean;
  sortOrder: number;
  notes?: string;
}

export interface AccountUpdateDto {
  accountName?: string;
  accountNameKana?: string;
  accountType?: '資産' | '負債' | '資本' | '収益' | '費用';
  parentAccountCode?: string;
  isDetail?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  notes?: string;
}

export interface Account {
  accountCode: string;
  accountName: string;
  accountNameKana: string | null;
  accountType: '資産' | '負債' | '資本' | '収益' | '費用';
  parentAccountCode: string | null;
  isDetail: boolean;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  subAccounts?: SubAccount[];
  childAccounts?: Account[];
  parentAccount?: Account;
}

export interface SubAccount {
  subAccountCode: string;
  accountCode: string;
  subAccountName: string;
  subAccountNameKana: string | null;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  account?: Account;
}

/**
 * 勘定科目Repository インターフェース
 */
export interface IAccountRepository extends 
  ISearchableRepository<Account, string>,
  ITransactionalRepository<Account, string> {
  
  // 勘定科目特有のメソッド
  findByType(accountType: Account['accountType']): Promise<Account[]>;
  findByParent(parentAccountCode: string): Promise<Account[]>;
  findDetailAccounts(): Promise<Account[]>;
  findActiveAccounts(): Promise<Account[]>;
  findWithSubAccounts(accountCode: string): Promise<Account | null>;
  findWithChildren(accountCode: string): Promise<Account | null>;
  
  // 階層構造関連
  getAccountHierarchy(): Promise<Account[]>;
  moveAccount(accountCode: string, newParentCode: string | null): Promise<Account>;
  updateSortOrder(updates: Array<{ accountCode: string; sortOrder: number }>): Promise<void>;
  
  // バリデーション関連
  isValidAccountCode(accountCode: string): Promise<boolean>;
  canDeleteAccount(accountCode: string): Promise<boolean>;
  
  // 統計・分析
  getAccountUsageStats(accountCode: string): Promise<{
    journalEntryCount: number;
    lastUsedDate: Date | null;
  }>;
}