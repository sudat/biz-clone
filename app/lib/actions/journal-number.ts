'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { JournalNumberService } from '@/lib/database';

// ============================================================================
// バリデーションスキーマ
// ============================================================================

const GenerateJournalNumberSchema = z.object({
  date: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    {
      message: '有効な日付を入力してください（YYYY-MM-DD形式）',
    }
  ),
  safe: z.boolean().optional().default(true),
  maxRetries: z.number().min(1).max(10).optional().default(3),
});

const GenerateMultipleJournalNumbersSchema = z.object({
  date: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    {
      message: '有効な日付を入力してください（YYYY-MM-DD形式）',
    }
  ),
  count: z.number().min(1).max(100),
});

const CheckJournalNumberSchema = z.object({
  journalNumber: z.string().min(1, '仕訳番号は必須です'),
});

const ValidateIntegritySchema = z.object({
  date: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    {
      message: '有効な日付を入力してください（YYYY-MM-DD形式）',
    }
  ),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 仕訳番号を生成するServer Action
 */
export async function generateJournalNumber(
  formData: FormData
): Promise<{
  success: boolean;
  data?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  try {
    // フォームデータをオブジェクトに変換
    const rawData = {
      date: formData.get('date') as string,
      safe: formData.get('safe') === 'true',
      maxRetries: parseInt(formData.get('maxRetries') as string) || 3,
    };

    // バリデーション
    const result = GenerateJournalNumberSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return {
        success: false,
        error: '入力データに問題があります',
        fieldErrors,
      };
    }

    const { date, safe, maxRetries } = result.data;

    // 仕訳番号生成
    const generateResult = safe
      ? await JournalNumberService.generateNextJournalNumberSafe(date, maxRetries)
      : await JournalNumberService.generateNextJournalNumber(date);

    if (!generateResult.success) {
      return {
        success: false,
        error: generateResult.error,
      };
    }

    // キャッシュ再検証
    revalidateTag('journal-numbers');
    revalidatePath('/siwake');

    return {
      success: true,
      data: generateResult.data,
    };
  } catch (error) {
    console.error('仕訳番号生成Server Actionエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 複数の仕訳番号を一括生成するServer Action
 */
export async function generateMultipleJournalNumbers(
  formData: FormData
): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  try {
    const rawData = {
      date: formData.get('date') as string,
      count: parseInt(formData.get('count') as string),
    };

    const result = GenerateMultipleJournalNumbersSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return {
        success: false,
        error: '入力データに問題があります',
        fieldErrors,
      };
    }

    const { date, count } = result.data;

    const generateResult = await JournalNumberService.generateMultipleJournalNumbers(date, count);

    if (!generateResult.success) {
      return {
        success: false,
        error: generateResult.error,
      };
    }

    revalidateTag('journal-numbers');
    revalidatePath('/siwake');

    return {
      success: true,
      data: generateResult.data,
    };
  } catch (error) {
    console.error('複数仕訳番号生成Server Actionエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 仕訳番号の存在をチェックするServer Action
 */
export async function checkJournalNumberExists(
  formData: FormData
): Promise<{
  success: boolean;
  data?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  try {
    const rawData = {
      journalNumber: formData.get('journalNumber') as string,
    };

    const result = CheckJournalNumberSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return {
        success: false,
        error: '入力データに問題があります',
        fieldErrors,
      };
    }

    const { journalNumber } = result.data;

    const checkResult = await JournalNumberService.checkJournalNumberExists(journalNumber);

    if (!checkResult.success) {
      return {
        success: false,
        error: checkResult.error,
      };
    }

    return {
      success: true,
      data: checkResult.data,
    };
  } catch (error) {
    console.error('仕訳番号存在チェックServer Actionエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 仕訳番号のプレビューを生成するServer Action
 */
export async function previewJournalNumber(
  formData: FormData
): Promise<{
  success: boolean;
  data?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  try {
    const rawData = {
      date: formData.get('date') as string,
    };

    const dateSchema = z.object({
      date: z.string().refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        {
          message: '有効な日付を入力してください（YYYY-MM-DD形式）',
        }
      ),
    });

    const result = dateSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return {
        success: false,
        error: '入力データに問題があります',
        fieldErrors,
      };
    }

    const { date } = result.data;

    const previewResult = await JournalNumberService.previewNextJournalNumber(date);

    if (!previewResult.success) {
      return {
        success: false,
        error: previewResult.error,
      };
    }

    return {
      success: true,
      data: previewResult.data,
    };
  } catch (error) {
    console.error('仕訳番号プレビューServer Actionエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 仕訳番号の整合性をチェックするServer Action
 */
export async function validateJournalNumberIntegrity(
  formData: FormData
): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  try {
    const rawData = {
      date: formData.get('date') as string || undefined,
    };

    const result = ValidateIntegritySchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return {
        success: false,
        error: '入力データに問題があります',
        fieldErrors,
      };
    }

    const { date } = result.data;

    const validateResult = await JournalNumberService.validateJournalNumberIntegrity(date);

    if (!validateResult.success) {
      return {
        success: false,
        error: validateResult.error,
      };
    }

    return {
      success: true,
      data: validateResult.data,
    };
  } catch (error) {
    console.error('仕訳番号整合性チェックServer Actionエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 特定日付の最後の仕訳番号を取得するServer Action
 */
export async function getLastJournalNumberForDate(
  formData: FormData
): Promise<{
  success: boolean;
  data?: string | null;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  try {
    const rawData = {
      date: formData.get('date') as string,
    };

    const dateSchema = z.object({
      date: z.string().refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        {
          message: '有効な日付を入力してください（YYYY-MM-DD形式）',
        }
      ),
    });

    const result = dateSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return {
        success: false,
        error: '入力データに問題があります',
        fieldErrors,
      };
    }

    const { date } = result.data;

    const lastNumberResult = await JournalNumberService.getLastJournalNumberForDate(date);

    if (!lastNumberResult.success) {
      return {
        success: false,
        error: lastNumberResult.error,
      };
    }

    return {
      success: true,
      data: lastNumberResult.data,
    };
  } catch (error) {
    console.error('最終仕訳番号取得Server Actionエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

// ============================================================================
// ヘルパー関数（Server Actions以外でも使用可能）
// ============================================================================

/**
 * オブジェクト形式で仕訳番号を生成する（Server Component等で使用）
 */
export async function generateJournalNumberDirect(params: {
  date: string;
  safe?: boolean;
  maxRetries?: number;
}): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const { date, safe = true, maxRetries = 3 } = params;

    const generateResult = safe
      ? await JournalNumberService.generateNextJournalNumberSafe(date, maxRetries)
      : await JournalNumberService.generateNextJournalNumber(date);

    return generateResult;
  } catch (error) {
    console.error('Direct仕訳番号生成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
} 