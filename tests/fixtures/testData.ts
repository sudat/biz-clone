/**
 * テスト用の固定データとサンプルデータ
 */

export const testAccounts = {
  cash: {
    accountCode: '1110',
    accountName: '現金',
    accountType: 'asset',
    isActive: true,
  },
  bankDeposit: {
    accountCode: '1210',
    accountName: '普通預金',
    accountType: 'asset',
    isActive: true,
  },
  accountsReceivable: {
    accountCode: '1310',
    accountName: '売掛金',
    accountType: 'asset',
    isActive: true,
  },
  prepaidConsumptionTax: {
    accountCode: '1355',
    accountName: '仮払消費税',
    accountType: 'asset',
    isActive: true,
  },
  accountsPayable: {
    accountCode: '2110',
    accountName: '買掛金',
    accountType: 'liability',
    isActive: true,
  },
  deferredConsumptionTax: {
    accountCode: '2250',
    accountName: '仮受消費税',
    accountType: 'liability',
    isActive: true,
  },
  sales: {
    accountCode: '4110',
    accountName: '売上高',
    accountType: 'revenue',
    isActive: true,
  },
  interestIncome: {
    accountCode: '4120',
    accountName: '受取利息',
    accountType: 'revenue',
    isActive: true,
  },
  purchases: {
    accountCode: '5110',
    accountName: '仕入高',
    accountType: 'expense',
    isActive: true,
  },
  travelExpense: {
    accountCode: '5210',
    accountName: '旅費交通費',
    accountType: 'expense',
    isActive: true,
  },
  communicationExpense: {
    accountCode: '5220',
    accountName: '通信費',
    accountType: 'expense',
    isActive: true,
  },
  consumableExpense: {
    accountCode: '5230',
    accountName: '消耗品費',
    accountType: 'expense',
    isActive: true,
  },
} as const;

export const testPartners = {
  customerA: {
    partnerCode: 'C001',
    partnerName: '株式会社テストクライアントA',
    isActive: true,
  },
  customerB: {
    partnerCode: 'C002',
    partnerName: '有限会社テストクライアントB',
    isActive: true,
  },
  supplierA: {
    partnerCode: 'S001',
    partnerName: '株式会社テストサプライヤーA',
    isActive: true,
  },
  supplierB: {
    partnerCode: 'S002',
    partnerName: '有限会社テストサプライヤーB',
    isActive: true,
  },
  bank: {
    partnerCode: 'B001',
    partnerName: 'テスト銀行',
    isActive: true,
  },
} as const;

export const testAnalysisCodes = {
  salesDept: {
    analysisCode: 'D001',
    analysisName: '営業部',
    analysisType: 'cost_center',
    isActive: true,
  },
  adminDept: {
    analysisCode: 'D002',
    analysisName: '管理部',
    analysisType: 'cost_center',
    isActive: true,
  },
  projectA: {
    analysisCode: 'P001',
    analysisName: 'プロジェクトA',
    analysisType: 'project',
    isActive: true,
  },
  projectB: {
    analysisCode: 'P002',
    analysisName: 'プロジェクトB',
    analysisType: 'project',
    isActive: true,
  },
} as const;

/**
 * テスト用の仕訳データパターン
 */
export const testJournalPatterns = {
  /**
   * 売上計上の仕訳
   */
  salesTransaction: {
    description: '商品販売',
    details: [
      {
        accountCode: testAccounts.cash.accountCode,
        amount: 110000,
        side: 'debit' as const,
        description: '現金売上',
        partnerCode: testPartners.customerA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
      {
        accountCode: testAccounts.sales.accountCode,
        amount: 100000,
        side: 'credit' as const,
        description: '売上高',
        partnerCode: testPartners.customerA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
      {
        accountCode: '2301', // 仮受消費税
        amount: 10000,
        side: 'credit' as const,
        description: '消費税',
        partnerCode: testPartners.customerA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
    ],
  },

  /**
   * 仕入計上の仕訳
   */
  purchaseTransaction: {
    description: '商品仕入',
    details: [
      {
        accountCode: testAccounts.purchases.accountCode,
        amount: 50000,
        side: 'debit' as const,
        description: '商品仕入',
        partnerCode: testPartners.supplierA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
      {
        accountCode: '2302', // 仮払消費税
        amount: 5000,
        side: 'debit' as const,
        description: '消費税',
        partnerCode: testPartners.supplierA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
      {
        accountCode: testAccounts.accountsPayable.accountCode,
        amount: 55000,
        side: 'credit' as const,
        description: '買掛金',
        partnerCode: testPartners.supplierA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
    ],
  },

  /**
   * 経費計上の仕訳
   */
  expenseTransaction: {
    description: '水道光熱費支払',
    details: [
      {
        accountCode: testAccounts.communicationExpense.accountCode,
        amount: 15000,
        side: 'debit' as const,
        description: '電気代',
        analysisCode: testAnalysisCodes.adminDept.analysisCode,
      },
      {
        accountCode: testAccounts.cash.accountCode,
        amount: 15000,
        side: 'credit' as const,
        description: '現金支払',
        analysisCode: testAnalysisCodes.adminDept.analysisCode,
      },
    ],
  },

  /**
   * 銀行取引の仕訳
   */
  bankTransaction: {
    description: '銀行振込',
    details: [
      {
        accountCode: testAccounts.bankDeposit.accountCode,
        amount: 200000,
        side: 'debit' as const,
        description: '普通預金入金',
        partnerCode: testPartners.bank.partnerCode,
        analysisCode: testAnalysisCodes.adminDept.analysisCode,
      },
      {
        accountCode: testAccounts.cash.accountCode,
        amount: 200000,
        side: 'credit' as const,
        description: '現金預入',
        partnerCode: testPartners.bank.partnerCode,
        analysisCode: testAnalysisCodes.adminDept.analysisCode,
      },
    ],
  },

  /**
   * 複数明細の複雑な仕訳
   */
  complexTransaction: {
    description: '月次決算整理',
    details: [
      {
        accountCode: testAccounts.accountsReceivable.accountCode,
        amount: 300000,
        side: 'debit' as const,
        description: '売掛金計上',
        partnerCode: testPartners.customerA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
      {
        accountCode: testAccounts.purchases.accountCode,
        amount: 100000,
        side: 'debit' as const,
        description: '期末商品棚卸',
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
      {
        accountCode: testAccounts.sales.accountCode,
        amount: 300000,
        side: 'credit' as const,
        description: '売上高',
        partnerCode: testPartners.customerA.partnerCode,
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
      {
        accountCode: testAccounts.purchases.accountCode,
        amount: 100000,
        side: 'credit' as const,
        description: '期首商品棚卸',
        analysisCode: testAnalysisCodes.salesDept.analysisCode,
      },
    ],
  },
} as const;

/**
 * バリデーションテスト用の不正データ
 */
export const invalidTestData = {
  /**
   * 不正な勘定科目コード
   */
  invalidAccountCode: 'INVALID',

  /**
   * 貸借不一致の仕訳
   */
  unbalancedJournal: {
    description: '貸借不一致テスト',
    details: [
      {
        accountCode: testAccounts.cash.accountCode,
        amount: 100000,
        side: 'debit' as const,
        description: '現金',
      },
      {
        accountCode: testAccounts.sales.accountCode,
        amount: 90000, // 金額が一致しない
        side: 'credit' as const,
        description: '売上',
      },
    ],
  },

  /**
   * 空の明細
   */
  emptyDetails: {
    description: '明細なしテスト',
    details: [],
  },

  /**
   * 金額ゼロの仕訳
   */
  zeroAmountJournal: {
    description: '金額ゼロテスト',
    details: [
      {
        accountCode: testAccounts.cash.accountCode,
        amount: 0,
        side: 'debit' as const,
        description: '現金',
      },
      {
        accountCode: testAccounts.sales.accountCode,
        amount: 0,
        side: 'credit' as const,
        description: '売上',
      },
    ],
  },
} as const;

/**
 * フォーム入力用のテストデータ
 */
export const formTestData = {
  validJournalDate: '2024-01-15',
  invalidJournalDate: '2024-13-45', // 不正な日付
  longDescription: 'A'.repeat(256), // 長すぎる摘要
  validAmount: '100000',
  invalidAmount: 'abc123', // 数値以外
  negativeAmount: '-100000', // 負の金額
  hugeAmount: '99999999999999', // 巨大な金額
} as const;