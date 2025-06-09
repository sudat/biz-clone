/**
 * Repository Factory
 * ============================================================================
 * Repository インスタンスの作成と管理
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { 
  IRepositoryFactory,
  IRepositoryContainer,
  IAccountRepository,
  IPartnerRepository,
  IAnalysisCodeRepository,
  IJournalRepository
} from '../interfaces';
import { AccountRepository } from '../implementations/AccountRepository';

export class RepositoryFactory implements IRepositoryFactory {
  constructor(private prisma: PrismaClient) {}

  createAccountRepository(): IAccountRepository {
    return new AccountRepository(this.prisma);
  }

  createPartnerRepository(): IPartnerRepository {
    // TODO: PartnerRepository実装後に追加
    throw new Error('PartnerRepository not implemented yet');
  }

  createAnalysisCodeRepository(): IAnalysisCodeRepository {
    // TODO: AnalysisCodeRepository実装後に追加
    throw new Error('AnalysisCodeRepository not implemented yet');
  }

  createJournalRepository(): IJournalRepository {
    // TODO: JournalRepository実装後に追加
    throw new Error('JournalRepository not implemented yet');
  }

  createContainer(): IRepositoryContainer {
    return {
      account: this.createAccountRepository(),
      partner: this.createPartnerRepository(),
      analysisCode: this.createAnalysisCodeRepository(),
      journal: this.createJournalRepository()
    };
  }
}

// シングルトンファクトリー
let repositoryFactory: RepositoryFactory | null = null;

export function getRepositoryFactory(prisma: PrismaClient): RepositoryFactory {
  if (!repositoryFactory) {
    repositoryFactory = new RepositoryFactory(prisma);
  }
  return repositoryFactory;
}