/**
 * Repository インターフェース統合エクスポート
 * ============================================================================
 * すべてのRepository インターフェースの統合エクスポート
 * ============================================================================
 */

// 基本インターフェース
export type {
  IRepository,
  ISearchableRepository,
  ITransactionalRepository,
  FilterOptions,
  PaginationOptions,
  PaginatedResult
} from './IRepository';

// 勘定科目Repository
export type {
  IAccountRepository,
  Account,
  AccountCreateDto,
  AccountUpdateDto,
  SubAccount
} from './IAccountRepository';

// 取引先Repository
export type {
  IPartnerRepository,
  Partner,
  PartnerCreateDto,
  PartnerUpdateDto
} from './IPartnerRepository';

// 分析コードRepository
export type {
  IAnalysisCodeRepository,
  AnalysisCode,
  AnalysisCodeCreateDto,
  AnalysisCodeUpdateDto
} from './IAnalysisCodeRepository';

// 仕訳Repository
export type {
  IJournalRepository,
  Journal,
  JournalDetail,
  JournalCreateDto,
  JournalUpdateDto,
  JournalDetailCreateDto,
  JournalSummary,
  TrialBalance
} from './IJournalRepository';

// Repository コンテナインターフェース
export interface IRepositoryContainer {
  account: IAccountRepository;
  partner: IPartnerRepository;
  analysisCode: IAnalysisCodeRepository;
  journal: IJournalRepository;
}

// Repository Factory インターフェース
export interface IRepositoryFactory {
  createAccountRepository(): IAccountRepository;
  createPartnerRepository(): IPartnerRepository;
  createAnalysisCodeRepository(): IAnalysisCodeRepository;
  createJournalRepository(): IJournalRepository;
  createContainer(): IRepositoryContainer;
}