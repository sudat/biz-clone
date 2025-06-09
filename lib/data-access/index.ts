/**
 * 統一データアクセス層エントリーポイント
 * ============================================================================
 * アプリケーション全体で使用するデータアクセス層の統一インターフェース
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { getServiceFactory, IServiceContainer } from '../services/factory/ServiceFactory';
import { getRepositoryFactory, RepositoryFactory } from '../repositories/factory/RepositoryFactory';
import { IRepositoryContainer } from '../repositories/interfaces';

// データアクセス層の統一コンテナ
export interface IDataAccessLayer {
  services: IServiceContainer;
  repositories: IRepositoryContainer;
  prisma: PrismaClient;
}

class DataAccessLayer implements IDataAccessLayer {
  public readonly services: IServiceContainer;
  public readonly repositories: IRepositoryContainer;

  constructor(public readonly prisma: PrismaClient) {
    const serviceFactory = getServiceFactory(prisma);
    const repositoryFactory = getRepositoryFactory(prisma);
    
    this.services = serviceFactory.createServiceContainer();
    this.repositories = repositoryFactory.createContainer();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// シングルトンインスタンス管理
let dataAccessLayer: DataAccessLayer | null = null;

/**
 * データアクセス層のインスタンスを取得
 */
export function getDataAccessLayer(prisma?: PrismaClient): DataAccessLayer {
  if (!dataAccessLayer) {
    if (!prisma) {
      throw new Error('PrismaClient is required for first initialization');
    }
    dataAccessLayer = new DataAccessLayer(prisma);
  }
  return dataAccessLayer;
}

/**
 * データアクセス層の初期化
 */
export function initializeDataAccessLayer(prisma: PrismaClient): DataAccessLayer {
  dataAccessLayer = new DataAccessLayer(prisma);
  return dataAccessLayer;
}

/**
 * データアクセス層のクリーンアップ
 */
export async function cleanupDataAccessLayer(): Promise<void> {
  if (dataAccessLayer) {
    await dataAccessLayer.disconnect();
    dataAccessLayer = null;
  }
}

// 便利なエクスポート
export { ServiceFactory, getServiceFactory } from '../services/factory/ServiceFactory';
export { RepositoryFactory, getRepositoryFactory } from '../repositories/factory/RepositoryFactory';

// 型エクスポート
export type { IServiceContainer } from '../services/factory/ServiceFactory';
export type { IRepositoryContainer } from '../repositories/interfaces';
export type { IAccountService } from '../services/interfaces/IAccountService';
export type { IAccountRepository, Account, AccountCreateDto, AccountUpdateDto } from '../repositories/interfaces/IAccountRepository';