/**
 * 仕訳関連のZodスキーマ定義
 * ============================================================================
 * 仕訳ヘッダ・明細のバリデーションスキーマを定義
 * ============================================================================
 */

import { z } from 'zod';

// 仕訳明細スキーマ
export const journalDetailSchema = z.object({
  // 借方・貸方区分
  debitCredit: z.enum(['debit', 'credit'], {
    required_error: '借方・貸方を選択してください',
  }),
  
  // 勘定科目
  accountCode: z
    .string()
    .min(1, '勘定科目を選択してください')
    .max(10, '勘定科目コードは10文字以内で入力してください'),
  
  // 補助科目（任意）
  subAccountCode: z
    .string()
    .max(15, '補助科目コードは15文字以内で入力してください')
    .optional(),
  
  // 取引先（任意）
  partnerCode: z
    .string()
    .max(15, '取引先コードは15文字以内で入力してください')
    .optional(),
  
  // 分析コード（任意）
  analysisCode: z
    .string()
    .max(15, '分析コードは15文字以内で入力してください')
    .optional(),
  
  // 金額
  amount: z
    .number({
      required_error: '金額を入力してください',
      invalid_type_error: '金額は数値で入力してください',
    })
    .positive('金額は0より大きい値を入力してください')
    .max(999999999999.99, '金額は999,999,999,999.99以下で入力してください'),
  
  // 摘要（任意）
  description: z
    .string()
    .max(200, '摘要は200文字以内で入力してください')
    .optional(),
});

// 仕訳ヘッダスキーマ
export const journalHeaderSchema = z.object({
  // 仕訳番号（自動生成）
  journalNumber: z
    .string()
    .length(15, '仕訳番号は15文字で入力してください')
    .regex(/^\d{15}$/, '仕訳番号は数字15桁で入力してください')
    .optional(), // 新規作成時は自動生成
  
  // 仕訳日付
  journalDate: z
    .date({
      required_error: '仕訳日付を入力してください',
      invalid_type_error: '有効な日付を入力してください',
    })
    .max(new Date(), '仕訳日付は本日以前の日付を入力してください'),
  
  // 摘要（任意）
  description: z
    .string()
    .max(500, '摘要は500文字以内で入力してください')
    .optional(),
});

// 完全な仕訳入力フォームスキーマ
export const journalEntrySchema = z
  .object({
    // ヘッダ情報
    header: journalHeaderSchema,
    
    // 明細情報（最低2行必要）
    details: z
      .array(journalDetailSchema)
      .min(2, '明細は最低2行入力してください')
      .max(50, '明細は最大50行まで入力できます'),
  })
  .refine(
    (data) => {
      // 借方・貸方の金額合計が一致するかチェック
      const debitTotal = data.details
        .filter((detail) => detail.debitCredit === 'debit')
        .reduce((sum, detail) => sum + detail.amount, 0);
      
      const creditTotal = data.details
        .filter((detail) => detail.debitCredit === 'credit')
        .reduce((sum, detail) => sum + detail.amount, 0);
      
      return Math.abs(debitTotal - creditTotal) < 0.01; // 小数点誤差を考慮
    },
    {
      message: '借方・貸方の金額合計が一致していません',
      path: ['details'],
    }
  )
  .refine(
    (data) => {
      // 最低1つずつ借方・貸方があるかチェック
      const hasDebit = data.details.some((detail) => detail.debitCredit === 'debit');
      const hasCredit = data.details.some((detail) => detail.debitCredit === 'credit');
      
      return hasDebit && hasCredit;
    },
    {
      message: '借方・貸方それぞれ最低1行ずつ入力してください',
      path: ['details'],
    }
  );

// 型定義をエクスポート
export type JournalDetailInput = z.infer<typeof journalDetailSchema>;
export type JournalHeaderInput = z.infer<typeof journalHeaderSchema>;
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;

// デフォルト値
export const defaultJournalDetail: JournalDetailInput = {
  debitCredit: 'debit',
  accountCode: '',
  amount: 0,
  description: '',
};

export const defaultJournalHeader: JournalHeaderInput = {
  journalDate: new Date(),
  description: '',
};

export const defaultJournalEntry: JournalEntryInput = {
  header: defaultJournalHeader,
  details: [
    { ...defaultJournalDetail, debitCredit: 'debit' },
    { ...defaultJournalDetail, debitCredit: 'credit' },
  ],
};