/**
 * 仕訳Repository インターフェース
 * ============================================================================
 * 仕訳データアクセス専用のインターフェース定義
 * ============================================================================
 */

import { ISearchableRepository, ITransactionalRepository } from './IRepository';

export interface JournalDetailCreateDto {
  lineNumber: number;
  debitCredit: 'D' | 'C';
  accountCode: string;
  subAccountCode?: string;
  amount: number;
  lineDescription?: string;
  partnerCode?: string;
  analysisCode?: string;
}

export interface JournalCreateDto {
  journalDate: string; // YYYY-MM-DD
  description: string;
  details: JournalDetailCreateDto[];
}

export interface JournalUpdateDto {
  journalDate?: string;
  description?: string;
  details?: Array<JournalDetailCreateDto & { id?: number }>;
}

export interface JournalDetail {
  id: number;
  journalNumber: string;
  lineNumber: number;
  debitCredit: 'D' | 'C';
  accountCode: string;
  subAccountCode: string | null;
  amount: number;
  lineDescription: string | null;
  partnerCode: string | null;
  analysisCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  journal?: Journal;
  account?: any; // Account from account repository
  subAccount?: any; // SubAccount from account repository
  partner?: any; // Partner from partner repository
  analysisCodeObj?: any; // AnalysisCode from analysis code repository
}

export interface Journal {
  journalNumber: string;
  journalDate: string;
  description: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  details: JournalDetail[];
}

export interface JournalSummary {
  journalNumber: string;
  journalDate: string;
  description: string;
  totalAmount: number;
  detailCount: number;
}

export interface TrialBalance {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
}

/**
 * 仕訳Repository インターフェース
 */
export interface IJournalRepository extends 
  ISearchableRepository<Journal, string>,
  ITransactionalRepository<Journal, string> {
  
  // 仕訳特有のメソッド
  findByDateRange(startDate: string, endDate: string): Promise<Journal[]>;
  findByAccount(accountCode: string, startDate?: string, endDate?: string): Promise<Journal[]>;
  findByPartner(partnerCode: string, startDate?: string, endDate?: string): Promise<Journal[]>;
  findByAnalysisCode(analysisCode: string, startDate?: string, endDate?: string): Promise<Journal[]>;
  
  // 仕訳明細関連
  createWithDetails(journalData: JournalCreateDto): Promise<Journal>;
  updateWithDetails(journalNumber: string, journalData: JournalUpdateDto): Promise<Journal>;
  getJournalDetails(journalNumber: string): Promise<JournalDetail[]>;
  
  // 仕訳番号管理
  generateJournalNumber(journalDate: string): Promise<string>;
  getLastJournalNumber(date: string): Promise<string | null>;
  
  // 残高・集計関連
  getTrialBalance(asOfDate: string): Promise<TrialBalance[]>;
  getAccountBalance(accountCode: string, asOfDate: string): Promise<number>;
  getMonthlyAmountSum(year: number, month: number, accountCode?: string): Promise<number>;
  
  // 検証・チェック関連
  validateJournalBalance(details: JournalDetailCreateDto[]): boolean;
  canDeleteJournal(journalNumber: string): Promise<boolean>;
  isJournalNumberUnique(journalNumber: string): Promise<boolean>;
  
  // レポート・分析
  getJournalSummaryByPeriod(
    startDate: string, 
    endDate: string, 
    limit?: number
  ): Promise<JournalSummary[]>;
  
  getAccountActivitySummary(
    accountCode: string,
    startDate: string,
    endDate: string
  ): Promise<{
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    entryCount: number;
  }>;
  
  // 仕訳複製
  duplicateJournal(journalNumber: string, newJournalDate: string): Promise<Journal>;
}