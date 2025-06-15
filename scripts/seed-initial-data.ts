/**
 * 統合初期データシードスクリプト
 * ロール、ユーザー、税区分、その他マスタデータを投入
 */

import { PrismaClient } from '../lib/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 初期データシードを開始します ===');

  try {
    // 1. 税区分マスタ（参照制約があるため最初に投入）
    console.log('税区分マスタを投入中...');
    await prisma.taxRate.createMany({
      data: [
        {
          taxCode: "TAX10",
          taxName: "消費税10%",
          taxRate: 10.00,
          sortOrder: 1,
          isActive: true,
        },
        {
          taxCode: "TAX8",
          taxName: "消費税8%（軽減税率）",
          taxRate: 8.00,
          sortOrder: 2,
          isActive: true,
        },
        {
          taxCode: "TAX0",
          taxName: "非課税・免税",
          taxRate: 0.00,
          sortOrder: 3,
          isActive: true,
        },
        {
          taxCode: "TAXFREE",
          taxName: "税抜処理用",
          taxRate: 0.00,
          sortOrder: 4,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });

    // 2. 勘定科目マスタ
    console.log('勘定科目マスタを投入中...');
    await prisma.account.createMany({
      data: [
        // 資産
        { accountCode: '1110', accountName: '現金', accountType: '資産', isTaxAccount: false },
        { accountCode: '1210', accountName: '普通預金', accountType: '資産', isTaxAccount: false },
        { accountCode: '1310', accountName: '売掛金', accountType: '資産', isTaxAccount: false },
        { accountCode: '1355', accountName: '仮払消費税', accountType: '資産', isTaxAccount: true },

        // 負債
        { accountCode: '2110', accountName: '買掛金', accountType: '負債', isTaxAccount: false },
        { accountCode: '2250', accountName: '仮受消費税', accountType: '負債', isTaxAccount: true },

        // 収益
        { accountCode: '4110', accountName: '売上高', accountType: '収益', isTaxAccount: false, defaultTaxCode: 'TAX10' },
        { accountCode: '4120', accountName: '受取利息', accountType: '収益', isTaxAccount: false },

        // 費用
        { accountCode: '5110', accountName: '仕入高', accountType: '費用', isTaxAccount: false, defaultTaxCode: 'TAX10' },
        { accountCode: '5210', accountName: '旅費交通費', accountType: '費用', isTaxAccount: false, defaultTaxCode: 'TAX10' },
        { accountCode: '5220', accountName: '通信費', accountType: '費用', isTaxAccount: false, defaultTaxCode: 'TAX10' },
        { accountCode: '5230', accountName: '消耗品費', accountType: '費用', isTaxAccount: false, defaultTaxCode: 'TAX10' },
      ],
      skipDuplicates: true,
    });

    // 3. 取引先マスタ
    console.log('取引先マスタを投入中...');
    await prisma.partner.createMany({
      data: [
        { partnerCode: 'C001', partnerName: 'サンプル得意先A', partnerType: 'customer' },
        { partnerCode: 'C002', partnerName: 'サンプル得意先B', partnerType: 'customer' },
        { partnerCode: 'V001', partnerName: 'サンプル仕入先A', partnerType: 'vendor' },
        { partnerCode: 'V002', partnerName: 'サンプル仕入先B', partnerType: 'vendor' },
        { partnerCode: 'B001', partnerName: 'メイン銀行', partnerType: 'bank' },
      ],
      skipDuplicates: true,
    });

    // 4. 分析種別マスタ
    console.log('分析種別マスタを投入中...');
    await prisma.analysisType.createMany({
      data: [
        { typeCode: 'department', typeName: '部門', sortOrder: 10 },
        { typeCode: 'project', typeName: 'プロジェクト', sortOrder: 20 },
      ],
      skipDuplicates: true,
    });

    // 5. 分析コードマスタ
    console.log('分析コードマスタを投入中...');
    await prisma.analysisCode.createMany({
      data: [
        { analysisCode: 'D001', analysisName: '営業部', analysisType: 'department' },
        { analysisCode: 'D002', analysisName: '総務部', analysisType: 'department' },
        { analysisCode: 'P001', analysisName: 'プロジェクトA', analysisType: 'project' },
        { analysisCode: 'P002', analysisName: 'プロジェクトB', analysisType: 'project' },
      ],
      skipDuplicates: true,
    });

    // 6. ロールマスタ（4つのロール）
    console.log('ロールマスタを投入中...');
    await prisma.role.createMany({
      data: [
        { 
          roleCode: 'GENERAL', 
          roleName: '一般ユーザー', 
          description: '基本的な業務操作を行う一般ユーザー',
          sortOrder: 10,
          isActive: true
        },
        { 
          roleCode: 'APPROVER', 
          roleName: '承認者', 
          description: '仕訳の承認権限を持つユーザー',
          sortOrder: 20,
          isActive: true
        },
        { 
          roleCode: 'MANAGER', 
          roleName: '責任者', 
          description: 'マスタデータの管理権限を持つ責任者',
          sortOrder: 30,
          isActive: true
        },
        { 
          roleCode: 'ADMIN', 
          roleName: 'システム管理者', 
          description: 'システム全体の管理権限を持つ管理者',
          sortOrder: 40,
          isActive: true
        },
      ],
      skipDuplicates: true,
    });

    // 7. 初期管理者ユーザー
    console.log('初期ユーザーを作成中...');
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    await prisma.user.createMany({
      data: [
        {
          userCode: 'ADMIN001',
          userName: 'システム管理者',
          userKana: 'システムカンリシャ',
          email: 'admin@example.com',
          passwordHash,
          roleCode: 'ADMIN',
          isActive: true,
        },
        {
          userCode: 'MGR001',
          userName: '管理責任者',
          userKana: 'カンリセキニンシャ',
          email: 'manager@example.com',
          passwordHash,
          roleCode: 'MANAGER',
          isActive: true,
        },
        {
          userCode: 'USER001',
          userName: '一般ユーザー',
          userKana: 'イッパンユーザー',
          email: 'user@example.com',
          passwordHash,
          roleCode: 'GENERAL',
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });

    console.log('=== 初期データシードが完了しました ===');

    // 投入結果の確認
    const counts = {
      taxRates: await prisma.taxRate.count(),
      accounts: await prisma.account.count(),
      partners: await prisma.partner.count(),
      analysisTypes: await prisma.analysisType.count(),
      analysisCodes: await prisma.analysisCode.count(),
      roles: await prisma.role.count(),
      users: await prisma.user.count(),
    };

    console.log('\n投入結果:');
    console.log(`- 税区分: ${counts.taxRates}件`);
    console.log(`- 勘定科目: ${counts.accounts}件`);
    console.log(`- 取引先: ${counts.partners}件`);
    console.log(`- 分析種別: ${counts.analysisTypes}件`);
    console.log(`- 分析コード: ${counts.analysisCodes}件`);
    console.log(`- ロール: ${counts.roles}件`);
    console.log(`- ユーザー: ${counts.users}件`);

    // 作成されたロールの詳細表示
    const roles = await prisma.role.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { roleCode: true, roleName: true, description: true },
    });
    console.log('\n作成されたロール:');
    roles.forEach(role => {
      console.log(`- ${role.roleCode}: ${role.roleName}`);
      console.log(`  ${role.description}`);
    });

    // 作成されたユーザーの詳細表示
    const users = await prisma.user.findMany({
      select: { userCode: true, userName: true, email: true, roleCode: true },
      orderBy: { userCode: 'asc' },
    });
    console.log('\n作成されたユーザー:');
    users.forEach(user => {
      console.log(`- ${user.userCode}: ${user.userName} (${user.email}) - ロール: ${user.roleCode}`);
    });
    console.log(`\nデフォルトパスワード: ${defaultPassword}`);
    console.log('※本番環境では必ずパスワードを変更してください');

  } catch (error) {
    console.error('初期データシードでエラーが発生しました:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });