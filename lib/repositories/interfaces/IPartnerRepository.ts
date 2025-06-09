/**
 * 取引先Repository インターフェース
 * ============================================================================
 * 取引先データアクセス専用のインターフェース定義
 * ============================================================================
 */

import { ISearchableRepository, ITransactionalRepository } from './IRepository';

export interface PartnerCreateDto {
  partnerCode: string;
  partnerName: string;
  partnerNameKana?: string;
  partnerType: '得意先' | '仕入先' | '銀行' | 'その他';
  zipCode?: string;
  address?: string;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  contactPerson?: string;
  isActive: boolean;
  notes?: string;
}

export interface PartnerUpdateDto {
  partnerName?: string;
  partnerNameKana?: string;
  partnerType?: '得意先' | '仕入先' | '銀行' | 'その他';
  zipCode?: string;
  address?: string;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  contactPerson?: string;
  isActive?: boolean;
  notes?: string;
}

export interface Partner {
  partnerCode: string;
  partnerName: string;
  partnerNameKana: string | null;
  partnerType: '得意先' | '仕入先' | '銀行' | 'その他';
  zipCode: string | null;
  address: string | null;
  phoneNumber: string | null;
  faxNumber: string | null;
  email: string | null;
  contactPerson: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 取引先Repository インターフェース
 */
export interface IPartnerRepository extends 
  ISearchableRepository<Partner, string>,
  ITransactionalRepository<Partner, string> {
  
  // 取引先特有のメソッド
  findByType(partnerType: Partner['partnerType']): Promise<Partner[]>;
  findActivePartners(): Promise<Partner[]>;
  findByEmail(email: string): Promise<Partner | null>;
  findByPhoneNumber(phoneNumber: string): Promise<Partner | null>;
  
  // 検索機能
  searchByContact(query: string): Promise<Partner[]>;
  searchByLocation(query: string): Promise<Partner[]>;
  
  // バリデーション関連
  isValidPartnerCode(partnerCode: string): Promise<boolean>;
  canDeletePartner(partnerCode: string): Promise<boolean>;
  isEmailUnique(email: string, excludePartnerCode?: string): Promise<boolean>;
  
  // 統計・分析
  getPartnerUsageStats(partnerCode: string): Promise<{
    journalEntryCount: number;
    lastUsedDate: Date | null;
    totalAmount: number;
  }>;
  
  getPartnersByUsage(limit?: number): Promise<Array<{
    partner: Partner;
    usageCount: number;
    lastUsedDate: Date | null;
  }>>;
}