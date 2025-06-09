/**
 * 仕訳Repository 実装クラス
 * ============================================================================
 * Prismaベースの仕訳データアクセス実装
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../base/BaseRepository';
import { 
  IJournalRepository, 
  Journal, 
  JournalDetail,
  JournalCreateDto, 
  JournalUpdateDto,
  JournalDetailCreateDto,
  TrialBalance,
  JournalSummary,
  FilterOptions 
} from '../interfaces/IJournalRepository';

export class JournalRepository extends BaseRepository<Journal, string> implements IJournalRepository {
  protected get modelName(): string {
    return 'journal';
  }

  protected getIdField(): string {
    return 'journalNumber';
  }

  protected mapToEntity(data: any): Journal {
    return {
      journalNumber: data.journalNumber,
      journalDate: data.journalDate?.toISOString().split('T')[0] || data.journalDate,
      description: data.description,
      totalAmount: data.totalAmount?.toNumber() || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      details: data.journalDetails?.map((detail: any) => this.mapDetailToEntity(detail)) || []
    };
  }

  private mapDetailToEntity(data: any): JournalDetail {
    return {
      id: data.id,
      journalNumber: data.journalNumber,
      lineNumber: data.lineNumber,
      debitCredit: data.debitCredit,
      accountCode: data.accountCode,
      subAccountCode: data.subAccountCode,
      amount: data.amount?.toNumber() || 0,
      lineDescription: data.lineDescription,
      partnerCode: data.partnerCode,
      analysisCode: data.analysisCode,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Journal[]> {
    try {
      const data = await this.prisma.journal.findMany({
        where: {
          journalDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        },
        orderBy: { journalDate: 'desc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByDateRange', error);
      throw error;
    }
  }

  async findByAccountCode(accountCode: string, startDate?: Date, endDate?: Date): Promise<Journal[]> {
    try {
      const whereCondition: any = {
        journalDetails: {
          some: { accountCode }
        }
      };

      if (startDate && endDate) {
        whereCondition.journalDate = {
          gte: startDate,
          lte: endDate
        };
      }

      const data = await this.prisma.journal.findMany({
        where: whereCondition,
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        },
        orderBy: { journalDate: 'desc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByAccountCode', error);
      throw error;
    }
  }

  async findByPartnerCode(partnerCode: string, startDate?: Date, endDate?: Date): Promise<Journal[]> {
    try {
      const whereCondition: any = {
        journalDetails: {
          some: { partnerCode }
        }
      };

      if (startDate && endDate) {
        whereCondition.journalDate = {
          gte: startDate,
          lte: endDate
        };
      }

      const data = await this.prisma.journal.findMany({
        where: whereCondition,
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        },
        orderBy: { journalDate: 'desc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByPartnerCode', error);
      throw error;
    }
  }

  async findByAnalysisCode(analysisCode: string, startDate?: Date, endDate?: Date): Promise<Journal[]> {
    try {
      const whereCondition: any = {
        journalDetails: {
          some: {
            OR: [
              { analysisCode1: analysisCode },
              { analysisCode2: analysisCode }
            ]
          }
        }
      };

      if (startDate && endDate) {
        whereCondition.journalDate = {
          gte: startDate,
          lte: endDate
        };
      }

      const data = await this.prisma.journal.findMany({
        where: whereCondition,
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        },
        orderBy: { journalDate: 'desc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByAnalysisCode', error);
      throw error;
    }
  }

  async findPendingApproval(): Promise<Journal[]> {
    try {
      const data = await this.prisma.journal.findMany({
        where: { isApproved: false },
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findPendingApproval', error);
      throw error;
    }
  }

  async findWithDetails(journalNumber: string): Promise<Journal | null> {
    try {
      const data = await this.prisma.journal.findUnique({
        where: { journalNumber },
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        }
      });
      
      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      this.handleError('findWithDetails', error);
      throw error;
    }
  }

  async approveJournal(journalNumber: string, approvedBy: string): Promise<Journal> {
    try {
      const data = await this.prisma.journal.update({
        where: { journalNumber },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy
        },
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        }
      });
      
      return this.mapToEntity(data);
    } catch (error) {
      this.handleError('approveJournal', error);
      throw error;
    }
  }

  async rejectJournal(journalNumber: string): Promise<Journal> {
    try {
      const data = await this.prisma.journal.update({
        where: { journalNumber },
        data: {
          isApproved: false,
          approvedAt: null,
          approvedBy: null
        },
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        }
      });
      
      return this.mapToEntity(data);
    } catch (error) {
      this.handleError('rejectJournal', error);
      throw error;
    }
  }

  async getNextJournalNumber(date: Date): Promise<string> {
    try {
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      
      const lastJournal = await this.prisma.journal.findFirst({
        where: {
          journalNumber: {
            startsWith: dateStr
          }
        },
        orderBy: { journalNumber: 'desc' }
      });

      if (!lastJournal) {
        return `${dateStr}0000001`;
      }

      const lastSequence = parseInt(lastJournal.journalNumber.slice(-7));
      const nextSequence = (lastSequence + 1).toString().padStart(7, '0');
      
      return `${dateStr}${nextSequence}`;
    } catch (error) {
      this.handleError('getNextJournalNumber', error);
      throw error;
    }
  }

  async validateJournalBalance(details: JournalDetail[]): Promise<boolean> {
    const debitTotal = details
      .filter(d => d.debitCredit === '借方')
      .reduce((sum, d) => sum + d.amount, 0);
    
    const creditTotal = details
      .filter(d => d.debitCredit === '貸方')
      .reduce((sum, d) => sum + d.amount, 0);
    
    return Math.abs(debitTotal - creditTotal) < 0.01; // 浮動小数点誤差を考慮
  }

  async createJournalWithDetails(journalData: JournalCreateDto, details: Omit<JournalDetail, 'journalDetailId' | 'journalNumber' | 'createdAt' | 'updatedAt'>[]): Promise<Journal> {
    try {
      // バランスチェック
      const isBalanced = await this.validateJournalBalance(details as JournalDetail[]);
      if (!isBalanced) {
        throw new Error('Journal entries are not balanced');
      }

      // 仕訳番号の生成
      const journalNumber = await this.getNextJournalNumber(journalData.journalDate);
      
      const totalAmount = details.reduce((sum, detail) => sum + detail.amount, 0) / 2; // 借方合計

      const result = await this.prisma.$transaction(async (tx) => {
        // 仕訳ヘッダー作成
        const journal = await tx.journal.create({
          data: {
            journalNumber,
            journalDate: journalData.journalDate,
            description: journalData.description,
            totalAmount,
            notes: journalData.notes,
            isApproved: false,
            createdBy: journalData.createdBy
          }
        });

        // 仕訳明細作成
        const journalDetails = await Promise.all(
          details.map((detail, index) =>
            tx.journalDetail.create({
              data: {
                journalNumber,
                lineNumber: index + 1,
                debitCredit: detail.debitCredit,
                accountCode: detail.accountCode,
                subAccountCode: detail.subAccountCode,
                partnerCode: detail.partnerCode,
                analysisCode1: detail.analysisCode1,
                analysisCode2: detail.analysisCode2,
                amount: detail.amount,
                description: detail.description,
                notes: detail.notes
              }
            })
          )
        );

        return {
          ...journal,
          journalDetails
        };
      });

      return this.mapToEntity(result);
    } catch (error) {
      this.handleError('createJournalWithDetails', error);
      throw error;
    }
  }

  async search(
    query: string, 
    fields: Array<keyof Journal>, 
    options?: FilterOptions<Journal>
  ): Promise<Journal[]> {
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

      const data = await this.prisma.journal.findMany({
        where: finalWhere,
        include: {
          journalDetails: {
            orderBy: { lineNumber: 'asc' }
          }
        },
        orderBy: options?.orderBy?.map(order => ({
          [order.field as string]: order.direction
        })) || [
          { journalDate: 'desc' }
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
    fields: Array<keyof Journal>,
    pagination: { page: number; limit: number },
    options?: FilterOptions<Journal>
  ): Promise<{ data: Journal[]; total: number; page: number; limit: number; totalPages: number }> {
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
        this.prisma.journal.findMany({
          where: finalWhere,
          include: {
            journalDetails: {
              orderBy: { lineNumber: 'asc' }
            }
          },
          orderBy: options?.orderBy?.map(order => ({
            [order.field as string]: order.direction
          })) || [
            { journalDate: 'desc' }
          ],
          skip: offset,
          take: limit
        }),
        this.prisma.journal.count({ where: finalWhere })
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

  async withTransaction<R>(fn: (repo: IJournalRepository) => Promise<R>): Promise<R> {
    return await this.prisma.$transaction(async (tx) => {
      const transactionalRepo = new JournalRepository(tx as PrismaClient);
      return await fn(transactionalRepo);
    });
  }
}