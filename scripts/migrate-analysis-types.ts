/**
 * 分析種別マスタ移行スクリプト
 * 既存の分析コードから分析種別を抽出してマスタに登録
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('分析種別の移行を開始します...');

  try {
    // 既存の分析コードから分析種別を取得
    const existingTypes = await prisma.analysisCode.findMany({
      where: { isActive: true },
      select: { analysisType: true },
      distinct: ['analysisType']
    });

    console.log(`既存の分析種別: ${existingTypes.map(t => t.analysisType).join(', ')}`);

    // 分析種別マスタに登録
    for (const type of existingTypes) {
      const typeCode = type.analysisType;
      const typeName = getTypeName(typeCode);

      // 既に存在するかチェック
      const existing = await prisma.analysisType.findUnique({
        where: { typeCode }
      });

      if (existing) {
        console.log(`分析種別 ${typeCode} は既に存在します`);
        continue;
      }

      // 新規作成
      await prisma.analysisType.create({
        data: {
          typeCode,
          typeName,
          isActive: true,
          sortOrder: getSortOrder(typeCode)
        }
      });

      console.log(`分析種別 ${typeCode} (${typeName}) を作成しました`);
    }

    console.log('分析種別の移行が完了しました');
  } catch (error) {
    console.error('移行エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 種別コードから名称を決定
function getTypeName(typeCode: string): string {
  const typeNames: Record<string, string> = {
    'department': '部門',
    'project': 'プロジェクト',
    'cost_center': 'コストセンター',
    'region': '地域',
    'product': '製品',
    'customer': '顧客分類'
  };

  return typeNames[typeCode] || typeCode;
}

// 種別コードから表示順序を決定
function getSortOrder(typeCode: string): number {
  const sortOrders: Record<string, number> = {
    'department': 10,
    'project': 20,
    'cost_center': 30,
    'region': 40,
    'product': 50,
    'customer': 60
  };

  return sortOrders[typeCode] || 99;
}

main().catch(console.error);