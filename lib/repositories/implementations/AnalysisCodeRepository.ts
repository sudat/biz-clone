/**
 * 分析コードRepository 実装クラス
 * ============================================================================
 * Prismaベースの分析コードデータアクセス実装
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../base/BaseRepository';
import { 
  IAnalysisCodeRepository, 
  AnalysisCode, 
  AnalysisCodeCreateDto, 
  AnalysisCodeUpdateDto,
  FilterOptions 
} from '../interfaces/IAnalysisCodeRepository';

export class AnalysisCodeRepository extends BaseRepository<AnalysisCode, string> implements IAnalysisCodeRepository {
  protected get modelName(): string {
    return 'analysisCode';
  }

  protected getIdField(): string {
    return 'analysisCode';
  }

  protected mapToEntity(data: any): AnalysisCode {
    return {
      analysisCode: data.analysisCode,
      analysisName: data.analysisName,
      analysisNameKana: data.analysisNameKana,
      analysisType: data.analysisType,
      parentAnalysisCode: data.parentAnalysisCode,
      isDetail: data.isDetail,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      childAnalysisCodes: data.childAnalysisCodes?.map((child: any) => this.mapToEntity(child)),
      parentAnalysisCode_obj: data.parentAnalysisCodeItem ? this.mapToEntity(data.parentAnalysisCodeItem) : undefined
    };
  }

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByType(analysisType: AnalysisCode['analysisType']): Promise<AnalysisCode[]> {
    try {
      const data = await this.prisma.analysisCode.findMany({
        where: { analysisType },
        orderBy: { sortOrder: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByType', error);
      throw error;
    }
  }

  async findByParent(parentAnalysisCode: string): Promise<AnalysisCode[]> {
    try {
      const data = await this.prisma.analysisCode.findMany({
        where: { parentAnalysisCode },
        orderBy: { sortOrder: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByParent', error);
      throw error;
    }
  }

  async findDetailAnalysisCodes(): Promise<AnalysisCode[]> {
    try {
      const data = await this.prisma.analysisCode.findMany({
        where: { isDetail: true },
        orderBy: [
          { analysisType: 'asc' },
          { sortOrder: 'asc' }
        ]
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findDetailAnalysisCodes', error);
      throw error;
    }
  }

  async findActiveAnalysisCodes(): Promise<AnalysisCode[]> {
    try {
      const data = await this.prisma.analysisCode.findMany({
        where: { isActive: true },
        orderBy: [
          { analysisType: 'asc' },
          { sortOrder: 'asc' }
        ]
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findActiveAnalysisCodes', error);
      throw error;
    }
  }

  async findWithChildren(analysisCode: string): Promise<AnalysisCode | null> {
    try {
      const data = await this.prisma.analysisCode.findUnique({
        where: { analysisCode },
        include: {
          childAnalysisCodes: {
            orderBy: { sortOrder: 'asc' }
          },
          parentAnalysisCodeItem: true
        }
      });
      
      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      this.handleError('findWithChildren', error);
      throw error;
    }
  }

  async getAnalysisCodeHierarchy(): Promise<AnalysisCode[]> {
    try {
      const data = await this.prisma.analysisCode.findMany({
        include: {
          childAnalysisCodes: {
            include: {
              childAnalysisCodes: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        where: {
          parentAnalysisCode: null
        },
        orderBy: [
          { analysisType: 'asc' },
          { sortOrder: 'asc' }
        ]
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('getAnalysisCodeHierarchy', error);
      throw error;
    }
  }

  async moveAnalysisCode(analysisCode: string, newParentCode: string | null): Promise<AnalysisCode> {
    try {
      // 循環参照チェック
      if (newParentCode) {
        const isCircular = await this.checkCircularReference(analysisCode, newParentCode);
        if (isCircular) {
          throw new Error('Circular reference detected');
        }
      }

      const data = await this.prisma.analysisCode.update({
        where: { analysisCode },
        data: { parentAnalysisCode: newParentCode }
      });
      
      return this.mapToEntity(data);
    } catch (error) {
      this.handleError('moveAnalysisCode', error);
      throw error;
    }
  }

  async updateSortOrder(updates: Array<{ analysisCode: string; sortOrder: number }>): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const update of updates) {
          await tx.analysisCode.update({
            where: { analysisCode: update.analysisCode },
            data: { sortOrder: update.sortOrder }
          });
        }
      });
    } catch (error) {
      this.handleError('updateSortOrder', error);
      throw error;
    }
  }

  async isValidAnalysisCode(analysisCode: string): Promise<boolean> {
    try {
      // 分析コードの形式チェック（英数字、3-10文字）
      const codePattern = /^[A-Z0-9]{3,10}$/;
      if (!codePattern.test(analysisCode)) {
        return false;
      }

      // 重複チェック
      const existing = await this.prisma.analysisCode.findUnique({
        where: { analysisCode }
      });
      
      return !existing;
    } catch (error) {
      this.handleError('isValidAnalysisCode', error);
      return false;
    }
  }

  async canDeleteAnalysisCode(analysisCode: string): Promise<boolean> {
    try {
      // 子分析コードの存在チェック
      const childCount = await this.prisma.analysisCode.count({
        where: { parentAnalysisCode: analysisCode }
      });
      
      if (childCount > 0) {
        return false;
      }

      // 仕訳での使用チェック
      const journalDetailCount = await this.prisma.journalDetail.count({
        where: { analysisCode1: analysisCode }
      });
      
      const journalDetailCount2 = await this.prisma.journalDetail.count({
        where: { analysisCode2: analysisCode }
      });
      
      return journalDetailCount === 0 && journalDetailCount2 === 0;
    } catch (error) {
      this.handleError('canDeleteAnalysisCode', error);
      return false;
    }
  }

  async getAnalysisCodeUsageStats(analysisCode: string): Promise<{
    journalEntryCount: number;
    lastUsedDate: Date | null;
    totalAmount: number;
  }> {
    try {
      const [count1, count2, lastEntry1, lastEntry2, amount1, amount2] = await Promise.all([
        this.prisma.journalDetail.count({
          where: { analysisCode1: analysisCode }
        }),
        this.prisma.journalDetail.count({
          where: { analysisCode2: analysisCode }
        }),
        this.prisma.journalDetail.findFirst({
          where: { analysisCode1: analysisCode },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        this.prisma.journalDetail.findFirst({
          where: { analysisCode2: analysisCode },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        this.prisma.journalDetail.aggregate({
          where: { analysisCode1: analysisCode },
          _sum: { amount: true }
        }),
        this.prisma.journalDetail.aggregate({
          where: { analysisCode2: analysisCode },
          _sum: { amount: true }
        })
      ]);
      
      const totalCount = count1 + count2;
      const totalAmount = (amount1._sum.amount?.toNumber() || 0) + (amount2._sum.amount?.toNumber() || 0);
      const lastUsedDate = [lastEntry1?.createdAt, lastEntry2?.createdAt]
        .filter(date => date)
        .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;
      
      return {
        journalEntryCount: totalCount,
        lastUsedDate,
        totalAmount
      };
    } catch (error) {
      this.handleError('getAnalysisCodeUsageStats', error);
      throw error;
    }
  }

  async getCostCenterSummary(period: { startDate: Date; endDate: Date }): Promise<Array<{
    analysisCode: string;
    analysisName: string;
    totalAmount: number;
    entryCount: number;
  }>> {
    try {
      const analysisCodes = await this.prisma.analysisCode.findMany({
        where: { 
          analysisType: 'コストセンター',
          isActive: true 
        }
      });

      const summaries = await Promise.all(
        analysisCodes.map(async (ac) => {
          const [amount1, amount2, count1, count2] = await Promise.all([
            this.prisma.journalDetail.aggregate({
              where: {
                analysisCode1: ac.analysisCode,
                createdAt: {
                  gte: period.startDate,
                  lte: period.endDate
                }
              },
              _sum: { amount: true },
              _count: true
            }),
            this.prisma.journalDetail.aggregate({
              where: {
                analysisCode2: ac.analysisCode,
                createdAt: {
                  gte: period.startDate,
                  lte: period.endDate
                }
              },
              _sum: { amount: true },
              _count: true
            })
          ]);

          const totalAmount = (amount1._sum.amount?.toNumber() || 0) + (amount2._sum.amount?.toNumber() || 0);
          const entryCount = count1._count + count2._count;

          return {
            analysisCode: ac.analysisCode,
            analysisName: ac.analysisName,
            totalAmount,
            entryCount
          };
        })
      );

      return summaries
        .filter(s => s.entryCount > 0 || s.totalAmount !== 0)
        .sort((a, b) => b.totalAmount - a.totalAmount);
    } catch (error) {
      this.handleError('getCostCenterSummary', error);
      throw error;
    }
  }

  async search(
    query: string, 
    fields: Array<keyof AnalysisCode>, 
    options?: FilterOptions<AnalysisCode>
  ): Promise<AnalysisCode[]> {
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

      const data = await this.prisma.analysisCode.findMany({
        where: finalWhere,
        orderBy: options?.orderBy?.map(order => ({
          [order.field as string]: order.direction
        })) || [
          { analysisType: 'asc' },
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
    fields: Array<keyof AnalysisCode>,
    pagination: { page: number; limit: number },
    options?: FilterOptions<AnalysisCode>
  ): Promise<{ data: AnalysisCode[]; total: number; page: number; limit: number; totalPages: number }> {
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
        this.prisma.analysisCode.findMany({
          where: finalWhere,
          orderBy: options?.orderBy?.map(order => ({
            [order.field as string]: order.direction
          })) || [
            { analysisType: 'asc' },
            { sortOrder: 'asc' }
          ],
          skip: offset,
          take: limit
        }),
        this.prisma.analysisCode.count({ where: finalWhere })
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

  async withTransaction<R>(fn: (repo: IAnalysisCodeRepository) => Promise<R>): Promise<R> {
    return await this.prisma.$transaction(async (tx) => {
      const transactionalRepo = new AnalysisCodeRepository(tx as PrismaClient);
      return await fn(transactionalRepo);
    });
  }

  // プライベートヘルパーメソッド
  private async checkCircularReference(analysisCode: string, newParentCode: string): Promise<boolean> {
    let currentParent = newParentCode;
    
    while (currentParent) {
      if (currentParent === analysisCode) {
        return true; // 循環参照発見
      }
      
      const parent = await this.prisma.analysisCode.findUnique({
        where: { analysisCode: currentParent },
        select: { parentAnalysisCode: true }
      });
      
      currentParent = parent?.parentAnalysisCode || null;
    }
    
    return false;
  }
}