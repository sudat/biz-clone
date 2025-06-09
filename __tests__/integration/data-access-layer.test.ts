/**
 * データアクセス層統合テスト
 * ============================================================================
 * Repository/Service層の統合テストと移行検証
 * ============================================================================
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { getDataAccessLayer, cleanupDataAccessLayer } from '../../lib/data-access';
import type { AccountCreateDto } from '../../lib/repositories/interfaces/IAccountRepository';

describe('Data Access Layer Integration Tests', () => {
  let prisma: PrismaClient;
  let dataAccess: any;

  beforeAll(async () => {
    // テスト用データベース接続
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
        }
      }
    });

    dataAccess = getDataAccessLayer(prisma);
  });

  afterAll(async () => {
    await cleanupDataAccessLayer();
  });

  beforeEach(async () => {
    // テストデータのクリーンアップ
    await prisma.account.deleteMany({
      where: {
        account_code: {
          startsWith: 'TEST_'
        }
      }
    });
  });

  describe('Account Service Integration', () => {
    test('アカウント作成とサービス層呼び出し', async () => {
      const accountService = dataAccess.services.account;
      
      const accountData: AccountCreateDto = {
        accountCode: 'TEST_ACC001',
        accountName: 'テスト勘定科目',
        accountNameKana: 'テストカンジョウカモク',
        accountType: '資産',
        parentAccountCode: null,
        isDetail: true,
        isActive: true,
        sortOrder: 1,
        notes: 'テスト用勘定科目'
      };

      // Service層での作成
      const createdAccount = await accountService.createAccount(accountData);
      
      expect(createdAccount).toBeDefined();
      expect(createdAccount.accountCode).toBe('TEST_ACC001');
      expect(createdAccount.accountName).toBe('テスト勘定科目');
      expect(createdAccount.accountType).toBe('資産');

      // Repository層での直接確認
      const accountRepo = dataAccess.repositories.account;
      const foundAccount = await accountRepo.findById('TEST_ACC001');
      
      expect(foundAccount).toBeDefined();
      expect(foundAccount?.accountCode).toBe('TEST_ACC001');
    });

    test('アカウント検索機能の統合テスト', async () => {
      const accountService = dataAccess.services.account;
      
      // テストデータ作成
      const testAccounts: AccountCreateDto[] = [
        {
          accountCode: 'TEST_SEARCH01',
          accountName: 'テスト検索用勘定1',
          accountType: '資産',
          isDetail: true,
          isActive: true,
          sortOrder: 1
        },
        {
          accountCode: 'TEST_SEARCH02',
          accountName: 'テスト検索用勘定2',
          accountType: '負債',
          isDetail: true,
          isActive: true,
          sortOrder: 2
        }
      ];

      for (const accountData of testAccounts) {
        await accountService.createAccount(accountData);
      }

      // 検索機能テスト
      const searchResult = await accountService.searchAccounts(
        'テスト検索',
        { page: 1, limit: 10 }
      );

      expect(searchResult.data).toHaveLength(2);
      expect(searchResult.total).toBe(2);
      expect(searchResult.page).toBe(1);

      // タイプ別フィルタリングテスト
      const assetAccounts = await accountService.getAccountsByType('資産');
      const foundTestAsset = assetAccounts.find(acc => acc.accountCode === 'TEST_SEARCH01');
      expect(foundTestAsset).toBeDefined();
    });

    test('アカウント階層構造のテスト', async () => {
      const accountService = dataAccess.services.account;
      
      // 親勘定科目作成
      const parentAccount: AccountCreateDto = {
        accountCode: 'TEST_PARENT',
        accountName: 'テスト親勘定科目',
        accountType: '資産',
        isDetail: false,
        isActive: true,
        sortOrder: 1
      };

      await accountService.createAccount(parentAccount);

      // 子勘定科目作成
      const childAccount: AccountCreateDto = {
        accountCode: 'TEST_CHILD',
        accountName: 'テスト子勘定科目',
        accountType: '資産',
        parentAccountCode: 'TEST_PARENT',
        isDetail: true,
        isActive: true,
        sortOrder: 1
      };

      await accountService.createAccount(childAccount);

      // 階層取得テスト
      const hierarchy = await accountService.getAccountHierarchy();
      const parentNode = hierarchy.find(node => node.accountCode === 'TEST_PARENT');
      
      expect(parentNode).toBeDefined();
      expect(parentNode?.children).toHaveLength(1);
      expect(parentNode?.children[0].accountCode).toBe('TEST_CHILD');
      expect(parentNode?.level).toBe(0);
      expect(parentNode?.children[0].level).toBe(1);
    });

    test('アカウント削除の制約チェック', async () => {
      const accountService = dataAccess.services.account;
      
      // 親勘定科目作成
      const parentAccount: AccountCreateDto = {
        accountCode: 'TEST_DELETE_PARENT',
        accountName: 'テスト削除親勘定科目',
        accountType: '資産',
        isDetail: false,
        isActive: true,
        sortOrder: 1
      };

      await accountService.createAccount(parentAccount);

      // 子勘定科目作成
      const childAccount: AccountCreateDto = {
        accountCode: 'TEST_DELETE_CHILD',
        accountName: 'テスト削除子勘定科目',
        accountType: '資産',
        parentAccountCode: 'TEST_DELETE_PARENT',
        isDetail: true,
        isActive: true,
        sortOrder: 1
      };

      await accountService.createAccount(childAccount);

      // 親勘定科目の削除チェック（子があるので削除不可）
      const canDeleteParent = await accountService.canDeleteAccount('TEST_DELETE_PARENT');
      expect(canDeleteParent.canDelete).toBe(false);
      expect(canDeleteParent.reason).toContain('子勘定科目');

      // 実際の削除試行（エラーになるはず）
      await expect(
        accountService.deleteAccount('TEST_DELETE_PARENT')
      ).rejects.toThrow();

      // 子勘定科目の削除（成功するはず）
      await accountService.deleteAccount('TEST_DELETE_CHILD');

      // 親勘定科目の削除チェック（子がないので削除可能）
      const canDeleteParentAfter = await accountService.canDeleteAccount('TEST_DELETE_PARENT');
      expect(canDeleteParentAfter.canDelete).toBe(true);

      // 親勘定科目の削除（成功するはず）
      await accountService.deleteAccount('TEST_DELETE_PARENT');

      // 削除確認
      const deletedAccount = await accountService.getAccount('TEST_DELETE_PARENT');
      expect(deletedAccount).toBeNull();
    });
  });

  describe('Repository Layer Tests', () => {
    test('Repository直接アクセスのテスト', async () => {
      const accountRepo = dataAccess.repositories.account;
      
      const accountData: AccountCreateDto = {
        accountCode: 'TEST_REPO001',
        accountName: 'テストRepository勘定科目',
        accountType: '資産',
        isDetail: true,
        isActive: true,
        sortOrder: 1
      };

      // Repository層での直接作成
      const createdAccount = await accountRepo.create(accountData);
      
      expect(createdAccount).toBeDefined();
      expect(createdAccount.accountCode).toBe('TEST_REPO001');

      // 検索テスト
      const foundAccount = await accountRepo.findById('TEST_REPO001');
      expect(foundAccount).toBeDefined();
      expect(foundAccount?.accountName).toBe('テストRepository勘定科目');

      // 存在チェック
      const exists = await accountRepo.exists('TEST_REPO001');
      expect(exists).toBe(true);

      // カウントテスト
      const count = await accountRepo.count({
        where: { accountType: '資産' }
      });
      expect(count).toBeGreaterThan(0);
    });

    test('Repository一括操作のテスト', async () => {
      const accountRepo = dataAccess.repositories.account;
      
      const bulkAccounts: AccountCreateDto[] = [
        {
          accountCode: 'TEST_BULK001',
          accountName: 'テスト一括勘定科目1',
          accountType: '資産',
          isDetail: true,
          isActive: true,
          sortOrder: 1
        },
        {
          accountCode: 'TEST_BULK002',
          accountName: 'テスト一括勘定科目2',
          accountType: '資産',
          isDetail: true,
          isActive: true,
          sortOrder: 2
        }
      ];

      // 一括作成
      const createdAccounts = await accountRepo.bulkCreate(bulkAccounts);
      expect(createdAccounts).toHaveLength(2);

      // 一括更新
      const updates = [
        { id: 'TEST_BULK001', data: { accountName: 'テスト一括勘定科目1更新' } },
        { id: 'TEST_BULK002', data: { accountName: 'テスト一括勘定科目2更新' } }
      ];

      const updatedAccounts = await accountRepo.bulkUpdate(updates);
      expect(updatedAccounts).toHaveLength(2);
      expect(updatedAccounts[0].accountName).toContain('更新');

      // 一括削除
      await accountRepo.bulkDelete(['TEST_BULK001', 'TEST_BULK002']);

      // 削除確認
      const deletedAccount1 = await accountRepo.findById('TEST_BULK001');
      const deletedAccount2 = await accountRepo.findById('TEST_BULK002');
      expect(deletedAccount1).toBeNull();
      expect(deletedAccount2).toBeNull();
    });
  });

  describe('Type Conversion Integration', () => {
    test('Service層とRepository層間の型変換', async () => {
      const accountService = dataAccess.services.account;
      
      // camelCase でのデータ作成（Service層）
      const accountData: AccountCreateDto = {
        accountCode: 'TEST_CONV001',
        accountName: 'テスト型変換勘定科目',
        accountNameKana: 'テストカタヘンカンカンジョウカモク',
        accountType: '資産',
        isDetail: true,
        isActive: true,
        sortOrder: 1,
        notes: 'カタ変換テスト'
      };

      const createdAccount = await accountService.createAccount(accountData);
      
      // データベースから直接確認（snake_case）
      const rawData = await prisma.account.findUnique({
        where: { account_code: 'TEST_CONV001' }
      });

      expect(rawData).toBeDefined();
      expect(rawData?.account_name).toBe('テスト型変換勘定科目');
      expect(rawData?.account_name_kana).toBe('テストカタヘンカンカンジョウカモク');
      expect(rawData?.is_detail).toBe(true);
      expect(rawData?.is_active).toBe(true);

      // Service層での取得（camelCase に変換される）
      const retrievedAccount = await accountService.getAccount('TEST_CONV001');
      expect(retrievedAccount).toBeDefined();
      expect(retrievedAccount?.accountName).toBe('テスト型変換勘定科目');
      expect(retrievedAccount?.accountNameKana).toBe('テストカタヘンカンカンジョウカモク');
      expect(retrievedAccount?.isDetail).toBe(true);
      expect(retrievedAccount?.isActive).toBe(true);
    });
  });
});