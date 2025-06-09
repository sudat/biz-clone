/**
 * 基本Repository実装クラス
 * ============================================================================
 * Prismaベースの基本Repository実装
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { 
  IRepository, 
  FilterOptions, 
  PaginationOptions, 
  PaginatedResult 
} from '../interfaces/IRepository';

export abstract class BaseRepository<T, K = string> implements IRepository<T, K> {
  protected constructor(protected prisma: PrismaClient) {}

  // サブクラスで実装する必要がある抽象メソッド
  protected abstract get modelName(): string;
  protected abstract mapToEntity(data: any): T;
  protected abstract getIdField(): string;

  async findById(id: K): Promise<T | null> {
    try {
      const model = this.getModel();
      const data = await model.findUnique({
        where: { [this.getIdField()]: id }
      });
      
      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      this.handleError('findById', error);
      throw error;
    }
  }

  async findAll(filter?: FilterOptions<T>): Promise<T[]> {
    try {
      const model = this.getModel();
      const query = this.buildQuery(filter);
      
      const data = await model.findMany(query);
      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('findAll', error);
      throw error;
    }
  }

  async findPaginated(
    pagination: PaginationOptions, 
    filter?: FilterOptions<T>
  ): Promise<PaginatedResult<T>> {
    try {
      const model = this.getModel();
      const query = this.buildQuery(filter);
      
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        model.findMany({
          ...query,
          skip: offset,
          take: limit
        }),
        model.count({ where: query.where })
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
      this.handleError('findPaginated', error);
      throw error;
    }
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const model = this.getModel();
      const data = await model.create({
        data: entity
      });
      
      return this.mapToEntity(data);
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }

  async update(id: K, entity: Partial<T>): Promise<T> {
    try {
      const model = this.getModel();
      const data = await model.update({
        where: { [this.getIdField()]: id },
        data: entity
      });
      
      return this.mapToEntity(data);
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }

  async delete(id: K): Promise<void> {
    try {
      const model = this.getModel();
      await model.delete({
        where: { [this.getIdField()]: id }
      });
    } catch (error) {
      this.handleError('delete', error);
      throw error;
    }
  }

  async count(filter?: FilterOptions<T>): Promise<number> {
    try {
      const model = this.getModel();
      const query = this.buildQuery(filter);
      
      return await model.count({ where: query.where });
    } catch (error) {
      this.handleError('count', error);
      throw error;
    }
  }

  async exists(id: K): Promise<boolean> {
    try {
      const model = this.getModel();
      const count = await model.count({
        where: { [this.getIdField()]: id }
      });
      
      return count > 0;
    } catch (error) {
      this.handleError('exists', error);
      throw error;
    }
  }

  async bulkCreate(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]> {
    try {
      const model = this.getModel();
      const data = await model.createMany({
        data: entities,
        skipDuplicates: true
      });
      
      // Prisma createMany doesn't return the created records
      // So we need to fetch them separately
      const idField = this.getIdField();
      const ids = entities.map(entity => entity[idField as keyof typeof entity]);
      
      const createdData = await model.findMany({
        where: {
          [idField]: {
            in: ids
          }
        }
      });
      
      return createdData.map(item => this.mapToEntity(item));
    } catch (error) {
      this.handleError('bulkCreate', error);
      throw error;
    }
  }

  async bulkUpdate(updates: Array<{ id: K; data: Partial<T> }>): Promise<T[]> {
    try {
      const results: T[] = [];
      
      // Prismaは一括更新の直接的なサポートがないため、トランザクション内で処理
      await this.prisma.$transaction(async (tx) => {
        for (const update of updates) {
          const model = this.getModel(tx);
          const data = await model.update({
            where: { [this.getIdField()]: update.id },
            data: update.data
          });
          results.push(this.mapToEntity(data));
        }
      });
      
      return results;
    } catch (error) {
      this.handleError('bulkUpdate', error);
      throw error;
    }
  }

  async bulkDelete(ids: K[]): Promise<void> {
    try {
      const model = this.getModel();
      await model.deleteMany({
        where: {
          [this.getIdField()]: {
            in: ids
          }
        }
      });
    } catch (error) {
      this.handleError('bulkDelete', error);
      throw error;
    }
  }

  // ヘルパーメソッド
  protected getModel(tx?: any) {
    const client = tx || this.prisma;
    return client[this.modelName];
  }

  protected buildQuery(filter?: FilterOptions<T>) {
    const query: any = {};
    
    if (filter?.where) {
      query.where = filter.where;
    }
    
    if (filter?.orderBy) {
      query.orderBy = filter.orderBy.map(order => ({
        [order.field as string]: order.direction
      }));
    }
    
    if (filter?.limit) {
      query.take = filter.limit;
    }
    
    if (filter?.offset) {
      query.skip = filter.offset;
    }
    
    if (filter?.include) {
      query.include = filter.include.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }
    
    return query;
  }

  protected handleError(operation: string, error: any): void {
    console.error(`[${this.constructor.name}] Error in ${operation}:`, error);
    
    // プロダクション環境では詳細なエラー情報を隠す
    if (process.env.NODE_ENV === 'production') {
      // センサリティブな情報を除去したエラーログ
      console.error(`Repository operation failed: ${operation}`);
    }
  }

  // トランザクション実行ヘルパー
  protected async withTransaction<R>(
    fn: (prisma: PrismaClient) => Promise<R>
  ): Promise<R> {
    return await this.prisma.$transaction(fn);
  }
}