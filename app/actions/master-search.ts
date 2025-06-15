/**
 * マスタ検索Server Actions
 * ============================================================================
 * 勘定科目、補助科目、取引先、分析コードの検索・一覧取得機能
 * ============================================================================
 */

"use server";

import { prisma } from "@/lib/database/prisma";

// 検索結果の型定義
export interface MasterSearchResult {
  code: string;
  name: string;
  type: 'account' | 'subAccount' | 'partner' | 'analysisCode' | 'role';
}

// 勘定科目検索
export async function searchAccounts(query: string): Promise<MasterSearchResult[]> {
  try {
    if (!query || query.length < 1) return [];

    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { accountCode: { contains: query, mode: 'insensitive' } },
          { accountName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      orderBy: [
        { accountCode: 'asc' }
      ]
    });

    return accounts.map(account => ({
      code: account.accountCode,
      name: account.accountName,
      type: 'account' as const
    }));
  } catch (error) {
    console.error('勘定科目検索エラー:', error);
    return [];
  }
}

// 補助科目検索
export async function searchSubAccounts(accountCode: string, query?: string): Promise<MasterSearchResult[]> {
  try {
    if (!accountCode) return [];

    const where: any = {
      accountCode: accountCode
    };

    if (query && query.length >= 1) {
      where.OR = [
        { subAccountCode: { contains: query, mode: 'insensitive' } },
        { subAccountName: { contains: query, mode: 'insensitive' } }
      ];
    }

    const subAccounts = await prisma.subAccount.findMany({
      where,
      take: 10,
      orderBy: [
        { subAccountCode: 'asc' }
      ]
    });

    return subAccounts.map(subAccount => ({
      code: subAccount.subAccountCode,
      name: subAccount.subAccountName,
      type: 'subAccount' as const
    }));
  } catch (error) {
    console.error('補助科目検索エラー:', error);
    return [];
  }
}

// 取引先検索
export async function searchPartners(query: string): Promise<MasterSearchResult[]> {
  try {
    if (!query || query.length < 1) return [];

    const partners = await prisma.partner.findMany({
      where: {
        OR: [
          { partnerCode: { contains: query, mode: 'insensitive' } },
          { partnerName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      orderBy: [
        { partnerCode: 'asc' }
      ]
    });

    return partners.map(partner => ({
      code: partner.partnerCode,
      name: partner.partnerName,
      type: 'partner' as const
    }));
  } catch (error) {
    console.error('取引先検索エラー:', error);
    return [];
  }
}

// 分析コード検索
export async function searchAnalysisCodes(query: string): Promise<MasterSearchResult[]> {
  try {
    if (!query || query.length < 1) return [];

    const analysisCodes = await prisma.analysisCode.findMany({
      where: {
        OR: [
          { analysisCode: { contains: query, mode: 'insensitive' } },
          { analysisName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      orderBy: [
        { analysisCode: 'asc' }
      ]
    });

    return analysisCodes.map(analysisCode => ({
      code: analysisCode.analysisCode,
      name: analysisCode.analysisName,
      type: 'analysisCode' as const
    }));
  } catch (error) {
    console.error('分析コード検索エラー:', error);
    return [];
  }
}

// 統合検索（全マスタを対象）
export async function searchAllMasters(query: string): Promise<MasterSearchResult[]> {
  try {
    if (!query || query.length < 1) return [];

    const [accounts, partners, analysisCodes] = await Promise.all([
      searchAccounts(query),
      searchPartners(query),
      searchAnalysisCodes(query)
    ]);

    return [...accounts, ...partners, ...analysisCodes];
  } catch (error) {
    console.error('統合マスタ検索エラー:', error);
    return [];
  }
}

// コードから名称を取得
export async function getMasterName(type: 'account' | 'subAccount' | 'partner' | 'analysisCode', code: string, parentCode?: string): Promise<string | null> {
  try {
    if (!code) return null;

    switch (type) {
      case 'account':
        const account = await prisma.account.findUnique({
          where: { 
            accountCode: code,
            isDetail: true  // 明細科目のみ
          }
        });
        return account?.accountName || null;

      case 'subAccount':
        if (!parentCode) return null;
        const subAccount = await prisma.subAccount.findUnique({
          where: { 
            accountCode_subAccountCode: {
              accountCode: parentCode,
              subAccountCode: code
            }
          }
        });
        return subAccount?.subAccountName || null;

      case 'partner':
        const partner = await prisma.partner.findUnique({
          where: { partnerCode: code }
        });
        return partner?.partnerName || null;

      case 'analysisCode':
        const analysisCode = await prisma.analysisCode.findUnique({
          where: { analysisCode: code }
        });
        return analysisCode?.analysisName || null;

      default:
        return null;
    }
  } catch (error) {
    console.error('マスタ名称取得エラー:', error);
    return null;
  }
}

// ============================================================================
// マスタ一覧取得機能（ダイアログ用）
// ============================================================================

// 全勘定科目取得（明細科目のみ）
export async function getAllAccounts(): Promise<MasterSearchResult[]> {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        isDetail: true  // 明細科目のみ
      },
      orderBy: [
        { accountCode: 'asc' }
      ]
    });

    return accounts.map(account => ({
      code: account.accountCode,
      name: account.accountName,
      type: 'account' as const
    }));
  } catch (error) {
    console.error('全勘定科目取得エラー:', error);
    return [];
  }
}

// 全補助科目取得
export async function getAllSubAccounts(accountCode: string): Promise<MasterSearchResult[]> {
  try {
    if (!accountCode) return [];

    const subAccounts = await prisma.subAccount.findMany({
      where: {
        accountCode: accountCode
      },
      orderBy: [
        { subAccountCode: 'asc' }
      ]
    });

    return subAccounts.map(subAccount => ({
      code: subAccount.subAccountCode,
      name: subAccount.subAccountName,
      type: 'subAccount' as const
    }));
  } catch (error) {
    console.error('全補助科目取得エラー:', error);
    return [];
  }
}

// 全取引先取得
export async function getAllPartners(): Promise<MasterSearchResult[]> {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: [
        { partnerCode: 'asc' }
      ]
    });

    return partners.map(partner => ({
      code: partner.partnerCode,
      name: partner.partnerName,
      type: 'partner' as const
    }));
  } catch (error) {
    console.error('全取引先取得エラー:', error);
    return [];
  }
}

// 全分析コード取得
export async function getAllAnalysisCodes(): Promise<MasterSearchResult[]> {
  try {
    const analysisCodes = await prisma.analysisCode.findMany({
      orderBy: [
        { analysisCode: 'asc' }
      ]
    });

    return analysisCodes.map(analysisCode => ({
      code: analysisCode.analysisCode,
      name: analysisCode.analysisName,
      type: 'analysisCode' as const
    }));
  } catch (error) {
    console.error('全分析コード取得エラー:', error);
    return [];
  }
}

// 全ロール取得
export async function getAllRoles(): Promise<MasterSearchResult[]> {
  try {
    const roles = await prisma.role.findMany({
      where: {
        isActive: true  // 有効なロールのみ
      },
      orderBy: [
        { sortOrder: 'asc' },
        { roleCode: 'asc' }
      ]
    });

    return roles.map(role => ({
      code: role.roleCode,
      name: role.roleName,
      type: 'role' as const
    }));
  } catch (error) {
    console.error('全ロール取得エラー:', error);
    return [];
  }
}