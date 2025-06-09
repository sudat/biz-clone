/**
 * Service インターフェース統合エクスポート
 * ============================================================================
 * すべてのService インターフェースの統合エクスポート
 * ============================================================================
 */

// 勘定科目Service
export type {
  IAccountService,
  CreateAccountWithSubAccountsDto,
  AccountSearchOptions,
  AccountHierarchyNode
} from './IAccountService';

// TODO: 他のServiceインターフェースも追加予定
// export type { IPartnerService } from './IPartnerService';
// export type { IAnalysisCodeService } from './IAnalysisCodeService';
// export type { IJournalService } from './IJournalService';