/**
 * Repository パターン基本インターフェース
 * ============================================================================
 * 統一されたデータアクセスインターフェースの定義
 * ============================================================================
 */

export interface FilterOptions<T> {
  where?: Partial<T>;
  orderBy?: Array<{
    field: keyof T;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
  offset?: number;
  include?: string[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 基本Repository インターフェース
 */
export interface IRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(filter?: FilterOptions<T>): Promise<T[]>;
  findPaginated(pagination: PaginationOptions, filter?: FilterOptions<T>): Promise<PaginatedResult<T>>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: K, entity: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
  count(filter?: FilterOptions<T>): Promise<number>;
  exists(id: K): Promise<boolean>;
  bulkCreate(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]>;
  bulkUpdate(updates: Array<{ id: K; data: Partial<T> }>): Promise<T[]>;
  bulkDelete(ids: K[]): Promise<void>;
}

/**
 * 検索機能付きRepository インターフェース
 */
export interface ISearchableRepository<T, K = string> extends IRepository<T, K> {
  search(query: string, fields: Array<keyof T>, options?: FilterOptions<T>): Promise<T[]>;
  searchPaginated(
    query: string, 
    fields: Array<keyof T>, 
    pagination: PaginationOptions, 
    options?: FilterOptions<T>
  ): Promise<PaginatedResult<T>>;
}

/**
 * トランザクション対応Repository インターフェース
 */
export interface ITransactionalRepository<T, K = string> extends IRepository<T, K> {
  withTransaction<R>(fn: (repo: IRepository<T, K>) => Promise<R>): Promise<R>;
}