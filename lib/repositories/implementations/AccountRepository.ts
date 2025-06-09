/**
 * 勘定科目Repository 実装クラス
 * ============================================================================
 * Prismaベースの勘定科目データアクセス実装
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../base/BaseRepository';
import { 
  IAccountRepository, 
  Account, 
  AccountCreateDto, 
  AccountUpdateDto,
  SubAccount,
  FilterOptions 
} from '../interfaces/IAccountRepository';

export class AccountRepository extends BaseRepository<Account, string> implements IAccountRepository {
  protected get modelName(): string {
    return 'account';
  }

  protected getIdField(): string {
    return 'accountCode';
  }

  protected mapToEntity(data: any): Account {
    return {
      accountCode: data.accountCode,
      accountName: data.accountName,
      accountNameKana: data.accountNameKana,
      accountType: data.accountType,
      parentAccountCode: data.parentAccountCode,
      isDetail: data.isDetail,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      subAccounts: data.subAccounts?.map(this.mapSubAccountToEntity),
      childAccounts: data.childAccounts?.map((child: any) => this.mapToEntity(child)),
      parentAccount: data.parentAccount ? this.mapToEntity(data.parentAccount) : undefined
    };
  }

  private mapSubAccountToEntity(data: any): SubAccount {
    return {
      subAccountCode: data.subAccountCode,
      accountCode: data.accountCode,
      subAccountName: data.subAccountName,
      subAccountNameKana: data.subAccountNameKana,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByType(accountType: Account['accountType']): Promise<Account[]> {
    try {
      const data = await this.prisma.account.findMany({
        where: { accountType },
        orderBy: { sortOrder: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByType', error);
      throw error;
    }
  }

  async findByParent(parentAccountCode: string): Promise<Account[]> {
    try {
      const data = await this.prisma.account.findMany({
        where: { parentAccountCode },
        orderBy: { sortOrder: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByParent', error);
      throw error;
    }
  }

  async findDetailAccounts(): Promise<Account[]> {
    try {
      const data = await this.prisma.account.findMany({
        where: { isDetail: true },
        orderBy: [
          { accountType: 'asc' },
          { sortOrder: 'asc' }
        ]
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findDetailAccounts', error);
      throw error;
    }
  }

  async findActiveAccounts(): Promise<Account[]> {
    try {
      const data = await this.prisma.account.findMany({
        where: { isActive: true },
        orderBy: [
          { accountType: 'asc' },
          { sortOrder: 'asc' }
        ]
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findActiveAccounts', error);
      throw error;
    }
  }

  async findWithSubAccounts(accountCode: string): Promise<Account | null> {
    try {
      const data = await this.prisma.account.findUnique({
        where: { accountCode },
        include: {
          subAccounts: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
      
      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      this.handleError('findWithSubAccounts', error);
      throw error;
    }
  }

  async findWithChildren(accountCode: string): Promise<Account | null> {
    try {
      const data = await this.prisma.account.findUnique({
        where: { accountCode },
        include: {
          childAccounts: {
            orderBy: { sortOrder: 'asc' }
          },
          parentAccount: true
        }
      });
      
      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      this.handleError('findWithChildren', error);
      throw error;
    }
  }

  async getAccountHierarchy(): Promise<Account[]> {
    try {
      const data = await this.prisma.account.findMany({
        include: {
          childAccounts: {
            include: {
              childAccounts: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        where: {
          parentAccountCode: null
        },
        orderBy: [
          { accountType: 'asc' },
          { sortOrder: 'asc' }
        ]
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('getAccountHierarchy', error);
      throw error;
    }
  }

  async moveAccount(accountCode: string, newParentCode: string | null): Promise<Account> {
    try {
      // 循環参照チェック
      if (newParentCode) {
        const isCircular = await this.checkCircularReference(accountCode, newParentCode);
        if (isCircular) {
          throw new Error('Circular reference detected');
        }
      }

      const data = await this.prisma.account.update({
        where: { accountCode },
        data: { parentAccountCode: newParentCode }
      });
      
      return this.mapToEntity(data);
    } catch (error) {
      this.handleError('moveAccount', error);
      throw error;
    }
  }

  async updateSortOrder(updates: Array<{ accountCode: string; sortOrder: number }>): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const update of updates) {
          await tx.account.update({
            where: { accountCode: update.accountCode },
            data: { sortOrder: update.sortOrder }
          });
        }
      });
    } catch (error) {
      this.handleError('updateSortOrder', error);
      throw error;
    }
  }

  async isValidAccountCode(accountCode: string): Promise<boolean> {
    try {
      // 勘定科目コードの形式チェック（英数字、3-10文字）
      const codePattern = /^[A-Z0-9]{3,10}$/;
      if (!codePattern.test(accountCode)) {
        return false;
      }

      // 重複チェック
      const existing = await this.prisma.account.findUnique({
        where: { accountCode }
      });
      
      return !existing;
    } catch (error) {
      this.handleError('isValidAccountCode', error);
      return false;
    }
  }

  async canDeleteAccount(accountCode: string): Promise<boolean> {
    try {
      // 子勘定科目の存在チェック
      const childCount = await this.prisma.account.count({
        where: { parentAccountCode: accountCode }
      });
      
      if (childCount > 0) {
        return false;
      }

      // 補助科目の存在チェック
      const subAccountCount = await this.prisma.subAccount.count({
        where: { accountCode }
      });
      
      if (subAccountCount > 0) {
        return false;
      }

      // 仕訳での使用チェック
      const journalDetailCount = await this.prisma.journalDetail.count({
        where: { accountCode }
      });
      
      return journalDetailCount === 0;
    } catch (error) {
      this.handleError('canDeleteAccount', error);
      return false;
    }
  }

  async getAccountUsageStats(accountCode: string): Promise<{
    journalEntryCount: number;
    lastUsedDate: Date | null;
  }> {
    try {
      const [journalEntryCount, lastEntry] = await Promise.all([
        this.prisma.journalDetail.count({
          where: { accountCode }
        }),
        this.prisma.journalDetail.findFirst({
          where: { accountCode },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        })
      ]);
      
      return {
        journalEntryCount,
        lastUsedDate: lastEntry?.createdAt || null
      };
    } catch (error) {
      this.handleError('getAccountUsageStats', error);
      throw error;
    }
  }

  async search(
    query: string, 
    fields: Array<keyof Account>, 
    options?: FilterOptions<Account>
  ): Promise<Account[]> {
    try {
      const whereConditions = fields.map(field => ({
        [field]: {
          contains: query,
          mode: 'insensitive' as const
        }
      }));

      const searchWhere = {
        OR: whereConditions
      };

      const finalWhere = options?.where 
        ? { AND: [searchWhere, options.where] }
        : searchWhere;

      const data = await this.prisma.account.findMany({
        where: finalWhere,
        orderBy: options?.orderBy?.map(order => ({
          [order.field as string]: order.direction
        })) || [
          { accountType: 'asc' },
          { sortOrder: 'asc' }
        ],
        take: options?.limit,
        skip: options?.offset
      });

      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('search', error);
      throw error;
    }
  }

  async searchPaginated(
    query: string,
    fields: Array<keyof Account>,
    pagination: { page: number; limit: number },
    options?: FilterOptions<Account>
  ): Promise<{ data: Account[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const whereConditions = fields.map(field => ({
        [field]: {
          contains: query,
          mode: 'insensitive' as const
        }
      }));

      const searchWhere = {
        OR: whereConditions
      };

      const finalWhere = options?.where 
        ? { AND: [searchWhere, options.where] }
        : searchWhere;

      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.account.findMany({
          where: finalWhere,
          orderBy: options?.orderBy?.map(order => ({
            [order.field as string]: order.direction
          })) || [
            { accountType: 'asc' },
            { sortOrder: 'asc' }
          ],
          skip: offset,
          take: limit
        }),
        this.prisma.account.count({ where: finalWhere })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map(item => this.mapToEntity(item)),
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.handleError('searchPaginated', error);
      throw error;
    }
  }

  async withTransaction<R>(fn: (repo: IAccountRepository) => Promise<R>): Promise<R> {
    return await this.prisma.$transaction(async (tx) => {
      const transactionalRepo = new AccountRepository(tx as PrismaClient);
      return await fn(transactionalRepo);
    });
  }

  // プライベートヘルパーメソッド
  private async checkCircularReference(accountCode: string, newParentCode: string): Promise<boolean> {
    let currentParent = newParentCode;
    
    while (currentParent) {
      if (currentParent === accountCode) {
        return true; // 循環参照発見
      }
      
      const parent = await this.prisma.account.findUnique({
        where: { accountCode: currentParent },
        select: { parentAccountCode: true }
      });
      
      currentParent = parent?.parentAccountCode || null;
    }
    
    return false;
  }
}