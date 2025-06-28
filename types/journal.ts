/**
 * 仕訳関連タイプ定義
 * ============================================================================
 * 仕訳データの統一インターフェース定義
 * ============================================================================
 */


// 仕訳明細データ（UI・Server Action共通）
export interface JournalDetailData {
  debitCredit: "debit" | "credit";
  accountCode: string;
  accountName?: string;
  subAccountCode?: string;
  subAccountName?: string;
  partnerCode?: string;
  partnerName?: string;
  analysisCode?: string;
  analysisCodeName?: string;
  departmentCode?: string;
  departmentName?: string;
  
  // 金額関連（消費税対応）
  baseAmount: number;      // 本体額（税抜）
  taxAmount: number;       // 消費税額
  totalAmount: number;     // 合計額（本体+税）
  
  // 消費税関連
  taxCode?: string;        // 税区分コード
  
  description?: string;
}

// 仕訳ヘッダーデータ
export interface JournalHeaderData {
  journalDate: Date;
  description?: string;
}

// 仕訳保存データ
export interface JournalSaveData {
  header: JournalHeaderData;
  details: JournalDetailData[];
  attachedFiles?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
}

// 仕訳保存結果
export interface JournalSaveResult {
  success: boolean;
  journalNumber?: string;
  error?: string;
}