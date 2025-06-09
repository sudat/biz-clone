/**
 * 分析コードRepository インターフェース
 * ============================================================================
 * 分析コードデータアクセス専用のインターフェース定義
 * ============================================================================
 */

import { ISearchableRepository, ITransactionalRepository } from './IRepository';

export interface AnalysisCodeCreateDto {
  analysisCode: string;
  analysisName: string;
  analysisNameKana?: string;
  analysisType: 'コストセンター' | 'プロジェクト' | '部門' | 'その他';
  parentAnalysisCode?: string;
  isActive: boolean;
  sortOrder: number;
  notes?: string;
}

export interface AnalysisCodeUpdateDto {
  analysisName?: string;
  analysisNameKana?: string;
  analysisType?: 'コストセンター' | 'プロジェクト' | '部門' | 'その他';
  parentAnalysisCode?: string;
  isActive?: boolean;
  sortOrder?: number;
  notes?: string;
}

export interface AnalysisCode {
  analysisCode: string;
  analysisName: string;
  analysisNameKana: string | null;
  analysisType: 'コストセンター' | 'プロジェクト' | '部門' | 'その他';
  parentAnalysisCode: string | null;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  childAnalysisCodes?: AnalysisCode[];
  parentAnalysisCode_obj?: AnalysisCode;
}

/**
 * 分析コードRepository インターフェース
 */
export interface IAnalysisCodeRepository extends 
  ISearchableRepository<AnalysisCode, string>,
  ITransactionalRepository<AnalysisCode, string> {
  
  // 分析コード特有のメソッド
  findByType(analysisType: AnalysisCode['analysisType']): Promise<AnalysisCode[]>;
  findByParent(parentAnalysisCode: string): Promise<AnalysisCode[]>;
  findActiveAnalysisCodes(): Promise<AnalysisCode[]>;
  findWithChildren(analysisCode: string): Promise<AnalysisCode | null>;
  
  // 階層構造関連
  getAnalysisCodeHierarchy(): Promise<AnalysisCode[]>;
  moveAnalysisCode(analysisCode: string, newParentCode: string | null): Promise<AnalysisCode>;
  updateSortOrder(updates: Array<{ analysisCode: string; sortOrder: number }>): Promise<void>;
  
  // バリデーション関連
  isValidAnalysisCode(analysisCode: string): Promise<boolean>;
  canDeleteAnalysisCode(analysisCode: string): Promise<boolean>;
  
  // 統計・分析
  getAnalysisCodeUsageStats(analysisCode: string): Promise<{
    journalEntryCount: number;
    lastUsedDate: Date | null;
    totalAmount: number;
  }>;
  
  getCostCenterSummary(period: { startDate: Date; endDate: Date }): Promise<Array<{
    analysisCode: string;
    analysisName: string;
    totalAmount: number;
    entryCount: number;
  }>>;
}