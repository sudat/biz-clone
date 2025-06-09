/**
 * Service Factory
 * ============================================================================
 * Service インスタンスの作成と依存性注入管理
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { RepositoryFactory, getRepositoryFactory } from '../../repositories/factory/RepositoryFactory';
import { AccountService } from '../AccountService';
import { IAccountService } from '../interfaces/IAccountService';

export interface IServiceContainer {
  account: IAccountService;
  // partner: IPartnerService;    // TODO: 実装予定
  // analysisCode: IAnalysisCodeService;  // TODO: 実装予定  
  // journal: IJournalService;    // TODO: 実装予定
}

export class ServiceFactory {
  private repositoryFactory: RepositoryFactory;

  constructor(prisma: PrismaClient) {
    this.repositoryFactory = getRepositoryFactory(prisma);
  }

  createAccountService(): IAccountService {
    const accountRepository = this.repositoryFactory.createAccountRepository();
    return new AccountService(accountRepository);
  }

  createServiceContainer(): IServiceContainer {
    return {
      account: this.createAccountService()
    };
  }
}

// シングルトンファクトリー
let serviceFactory: ServiceFactory | null = null;

export function getServiceFactory(prisma: PrismaClient): ServiceFactory {
  if (!serviceFactory) {
    serviceFactory = new ServiceFactory(prisma);
  }
  return serviceFactory;
}