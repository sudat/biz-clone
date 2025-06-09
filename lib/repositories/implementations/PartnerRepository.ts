/**
 * 取引先Repository 実装クラス
 * ============================================================================
 * Prismaベースの取引先データアクセス実装
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../base/BaseRepository';
import { 
  IPartnerRepository, 
  Partner, 
  PartnerCreateDto, 
  PartnerUpdateDto,
  FilterOptions 
} from '../interfaces/IPartnerRepository';

export class PartnerRepository extends BaseRepository<Partner, string> implements IPartnerRepository {
  protected get modelName(): string {
    return 'partner';
  }

  protected getIdField(): string {
    return 'partnerCode';
  }

  protected mapToEntity(data: any): Partner {
    return {
      partnerCode: data.partnerCode,
      partnerName: data.partnerName,
      partnerNameKana: data.partnerNameKana,
      partnerType: data.partnerType,
      zipCode: data.zipCode,
      address: data.address,
      phoneNumber: data.phoneNumber,
      faxNumber: data.faxNumber,
      email: data.email,
      contactPerson: data.contactPerson,
      isActive: data.isActive,
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByType(partnerType: Partner['partnerType']): Promise<Partner[]> {
    try {
      const data = await this.prisma.partner.findMany({
        where: { partnerType },
        orderBy: { partnerName: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findByType', error);
      throw error;
    }
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Partner | null> {
    try {
      const data = await this.prisma.partner.findFirst({
        where: { phoneNumber }
      });
      
      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      this.handleError('findByPhoneNumber', error);
      throw error;
    }
  }

  async searchByContact(query: string): Promise<Partner[]> {
    try {
      const data = await this.prisma.partner.findMany({
        where: {
          OR: [
            { contactPerson: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phoneNumber: { contains: query, mode: 'insensitive' } }
          ]
        },
        orderBy: { partnerName: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('searchByContact', error);
      throw error;
    }
  }

  async searchByLocation(query: string): Promise<Partner[]> {
    try {
      const data = await this.prisma.partner.findMany({
        where: {
          OR: [
            { address: { contains: query, mode: 'insensitive' } },
            { zipCode: { contains: query, mode: 'insensitive' } }
          ]
        },
        orderBy: { partnerName: 'asc' }
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('searchByLocation', error);
      throw error;
    }
  }

  async isEmailUnique(email: string, excludePartnerCode?: string): Promise<boolean> {
    try {
      const whereCondition: any = { email };
      if (excludePartnerCode) {
        whereCondition.partnerCode = { not: excludePartnerCode };
      }

      const existing = await this.prisma.partner.findFirst({
        where: whereCondition
      });
      
      return !existing;
    } catch (error) {
      this.handleError('isEmailUnique', error);
      return false;
    }
  }

  async getPartnersByUsage(limit: number = 10): Promise<Array<{
    partner: Partner;
    usageCount: number;
    lastUsedDate: Date | null;
  }>> {
    try {
      const usageStats = await this.prisma.journalDetail.groupBy({
        by: ['partnerCode'],
        _count: { partnerCode: true },
        _max: { createdAt: true },
        where: { partnerCode: { not: null } },
        orderBy: { _count: { partnerCode: 'desc' } },
        take: limit
      });

      const partners = await Promise.all(
        usageStats.map(async (stat) => {
          const partner = await this.findById(stat.partnerCode!);
          return {
            partner: partner!,
            usageCount: stat._count.partnerCode,
            lastUsedDate: stat._max.createdAt
          };
        })
      );

      return partners.filter(p => p.partner);
    } catch (error) {
      this.handleError('getPartnersByUsage', error);
      throw error;
    }
  }

  async findActivePartners(): Promise<Partner[]> {
    try {
      const data = await this.prisma.partner.findMany({
        where: { isActive: true },
        orderBy: [
          { partnerType: 'asc' },
          { partnerName: 'asc' }
        ]
      });
      
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findActivePartners', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Partner | null> {
    try {
      const data = await this.prisma.partner.findFirst({
        where: { email }
      });
      
      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      this.handleError('findByEmail', error);
      throw error;
    }
  }

  async isValidPartnerCode(partnerCode: string): Promise<boolean> {
    try {
      // 取引先コードの形式チェック（英数字、3-10文字）
      const codePattern = /^[A-Z0-9]{3,10}$/;
      if (!codePattern.test(partnerCode)) {
        return false;
      }

      // 重複チェック
      const existing = await this.prisma.partner.findUnique({
        where: { partnerCode }
      });
      
      return !existing;
    } catch (error) {
      this.handleError('isValidPartnerCode', error);
      return false;
    }
  }

  async canDeletePartner(partnerCode: string): Promise<boolean> {
    try {
      // 仕訳での使用チェック
      const journalDetailCount = await this.prisma.journalDetail.count({
        where: { partnerCode }
      });
      
      return journalDetailCount === 0;
    } catch (error) {
      this.handleError('canDeletePartner', error);
      return false;
    }
  }

  async getPartnerUsageStats(partnerCode: string): Promise<{
    journalEntryCount: number;
    lastUsedDate: Date | null;
    totalAmount: number;
  }> {
    try {
      const [journalDetailCount, lastEntry, amountSum] = await Promise.all([
        this.prisma.journalDetail.count({
          where: { partnerCode }
        }),
        this.prisma.journalDetail.findFirst({
          where: { partnerCode },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        this.prisma.journalDetail.aggregate({
          where: { partnerCode },
          _sum: { amount: true }
        })
      ]);
      
      return {
        journalEntryCount: journalDetailCount,
        lastUsedDate: lastEntry?.createdAt || null,
        totalAmount: amountSum._sum.amount?.toNumber() || 0
      };
    } catch (error) {
      this.handleError('getPartnerUsageStats', error);
      throw error;
    }
  }

  async search(
    query: string, 
    fields: Array<keyof Partner>, 
    options?: FilterOptions<Partner>
  ): Promise<Partner[]> {
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

      const data = await this.prisma.partner.findMany({
        where: finalWhere,
        orderBy: options?.orderBy?.map(order => ({
          [order.field as string]: order.direction
        })) || [
          { partnerType: 'asc' },
          { partnerName: 'asc' }
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
    fields: Array<keyof Partner>,
    pagination: { page: number; limit: number },
    options?: FilterOptions<Partner>
  ): Promise<{ data: Partner[]; total: number; page: number; limit: number; totalPages: number }> {
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
        this.prisma.partner.findMany({
          where: finalWhere,
          orderBy: options?.orderBy?.map(order => ({
            [order.field as string]: order.direction
          })) || [
            { partnerType: 'asc' },
            { partnerName: 'asc' }
          ],
          skip: offset,
          take: limit
        }),
        this.prisma.partner.count({ where: finalWhere })
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

  async withTransaction<R>(fn: (repo: IPartnerRepository) => Promise<R>): Promise<R> {
    return await this.prisma.$transaction(async (tx) => {
      const transactionalRepo = new PartnerRepository(tx as PrismaClient);
      return await fn(transactionalRepo);
    });
  }
}