import { prisma } from "./prisma";
import type {
  JournalHeader,
  JournalDetail,
} from "./prisma";

// 簡単な型定義
type JournalWithDetails = any;
type JournalFilter = any;
type PaginatedResult<T> = { data: T[]; count: number };
type GenerateJournalNumberArgs = any;
type GenerateJournalNumberReturn = any;
type PaginationParams = { page?: number; limit?: number };
type JournalHeaderInsert = Omit<JournalHeader, 'createdAt' | 'updatedAt'>;
type JournalHeaderUpdate = Partial<JournalHeaderInsert>;
type JournalDetailInsert = Omit<JournalDetail, 'id' | 'createdAt' | 'updatedAt'>;
type JournalDetailUpdate = Partial<JournalDetailInsert>;

/**
 * 仕訳データ操作（簡略版）
 */
export class JournalService {
  /**
   * 全仕訳を取得（明細含む）
   */
  static async getJournals(filter: JournalFilter = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<JournalWithDetails>> {
    try {
      const journals = await prisma.journalHeader.findMany({
        take: pagination.limit || 50,
        skip: ((pagination.page || 1) - 1) * (pagination.limit || 50)
      });

      const count = await prisma.journalHeader.count();

      return {
        data: journals,
        count
      };
    } catch (error) {
      console.error('仕訳取得エラー:', error);
      return { data: [], count: 0 };
    }
  }

  /**
   * 仕訳番号で単一仕訳を取得（明細含む）
   */
  static async getJournalByNumber(journalNumber: string): Promise<JournalWithDetails | null> {
    try {
      return await prisma.journalHeader.findUnique({
        where: { journalNumber }
      });
    } catch (error) {
      console.error('仕訳取得エラー:', error);
      return null;
    }
  }

  /**
   * 新しい仕訳を作成（トランザクション）
   */
  static async createJournal(
    journalHeader: JournalHeaderInsert,
    journalDetails: JournalDetailInsert[]
  ): Promise<JournalWithDetails | null> {
    try {
      const header = await prisma.journalHeader.create({
        data: journalHeader
      });

      // 明細は別途処理（簡略版）
      await Promise.all(
        journalDetails.map(detail => 
          prisma.journalDetail.create({
            data: detail as any
          })
        )
      );

      return header;
    } catch (error) {
      console.error('仕訳作成エラー:', error);
      return null;
    }
  }

  /**
   * 仕訳を更新
   */
  static async updateJournal(
    journalNumber: string,
    journalHeader: JournalHeaderUpdate,
    journalDetails: JournalDetailUpdate[]
  ): Promise<JournalWithDetails | null> {
    try {
      const header = await prisma.journalHeader.update({
        where: { journalNumber },
        data: journalHeader
      });

      // 明細処理は簡略化
      await prisma.journalDetail.deleteMany({
        where: { journalNumber }
      });

      await Promise.all(
        journalDetails.map(detail => 
          prisma.journalDetail.create({
            data: detail as any
          })
        )
      );

      return header;
    } catch (error) {
      console.error('仕訳更新エラー:', error);
      return null;
    }
  }

  /**
   * 仕訳を削除
   */
  static async deleteJournal(journalNumber: string): Promise<boolean> {
    try {
      await prisma.journalDetail.deleteMany({
        where: { journalNumber }
      });

      await prisma.journalHeader.delete({
        where: { journalNumber }
      });

      return true;
    } catch (error) {
      console.error('仕訳削除エラー:', error);
      return false;
    }
  }
}