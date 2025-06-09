import { JournalService, JournalDetailInsert } from "@/lib/database";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CreateJournalSchema, JournalFilter, PaginationParams } from "@/lib/database";

// 仕訳ヘッダと明細の結合型を定義
const JournalEntrySchema = z.object({
  journal_date: z.string().min(1, "仕訳日付は必須です"),
  description: z.string().optional(),
  details: z.array(z.object({
    line_number: z.number(),
    debit_credit: z.enum(['D', 'C']),
    account_code: z.string().min(1, "勘定科目は必須です"),
    sub_account_code: z.string().optional(),
    partner_code: z.string().optional(),
    analysis_code: z.string().optional(),
    amount: z.number().min(0, "金額は0以上である必要があります"),
    line_description: z.string().optional(),
  })).min(1, "仕訳明細は最低1行必要です"),
});

/**
 * 仕訳を作成するServer Action
 */
export async function createJournalAction(formData: FormData) {
  const rawFormData = {
    journal_date: formData.get('journal_date'),
    description: formData.get('description'),
    details: JSON.parse(formData.get('details') as string || '[]'), // 明細はJSON文字列として渡される想定
  };

  const validatedFields = JournalEntrySchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '入力エラーがあります。確認してください。'
    };
  }

  const { journal_date, description, details } = validatedFields.data;

  try {
    // 仕訳番号を生成
    const journal_number = await JournalService.generateJournalNumber({ journal_date });

    const newJournalHeader = {
      journal_number,
      journal_date,
      description: description || null,
      total_amount: details.reduce((sum, d) => sum + d.amount, 0), // 合計金額を計算
    };

    const newJournalDetails: JournalDetailInsert[] = details.map((detail, index) => ({
      journal_number: journal_number,
      line_number: index + 1,
      debit_credit: detail.debit_credit,
      account_code: detail.account_code,
      sub_account_code: detail.sub_account_code || null,
      partner_code: detail.partner_code || null,
      analysis_code: detail.analysis_code || null,
      amount: detail.amount,
      line_description: detail.line_description || null,
    }));

    await JournalService.createJournal(newJournalHeader, newJournalDetails);
  } catch (error) {
    console.error("仕訳作成エラー:", error);
    return { message: '仕訳の作成に失敗しました。' };
  }

  revalidatePath('/siwake'); // 仕訳リストページを再検証
  redirect('/siwake'); // 作成後に仕訳リストページにリダイレクト
}

/**
 * 仕訳を更新するServer Action
 */
export async function updateJournalAction(
  journalNumber: string,
  formData: FormData
) {
  const rawFormData = {
    journal_date: formData.get('journal_date'),
    description: formData.get('description'),
    details: JSON.parse(formData.get('details') as string || '[]'),
  };

  const validatedFields = JournalEntrySchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '入力エラーがあります。確認してください。'
    };
  }

  const { journal_date, description, details } = validatedFields.data;

  try {
    const updatedJournalHeader = {
      journal_date,
      description: description || null,
      total_amount: details.reduce((sum, d) => sum + d.amount, 0),
    };

    const updatedJournalDetails: JournalDetailInsert[] = details.map((detail, index) => ({
      journal_number: journalNumber,
      line_number: index + 1,
      debit_credit: detail.debit_credit,
      account_code: detail.account_code,
      sub_account_code: detail.sub_account_code || null,
      partner_code: detail.partner_code || null,
      analysis_code: detail.analysis_code || null,
      amount: detail.amount,
      line_description: detail.line_description || null,
    }));

    await JournalService.updateJournal(
      journalNumber,
      updatedJournalHeader,
      updatedJournalDetails
    );
  } catch (error) {
    console.error("仕訳更新エラー:", error);
    return { message: '仕訳の更新に失敗しました。' };
  }

  revalidatePath(`/siwake/${journalNumber}`); // 個別仕訳ページを再検証
  revalidatePath('/siwake'); // 仕訳リストページを再検証
  redirect(`/siwake/${journalNumber}`);
}

/**
 * 仕訳を削除するServer Action
 */
export async function deleteJournalAction(journalNumber: string) {
  try {
    await JournalService.deleteJournal(journalNumber);
  } catch (error) {
    console.error("仕訳削除エラー:", error);
    return { message: '仕訳の削除に失敗しました。' };
  }

  revalidatePath('/siwake'); // 仕訳リストページを再検証
  redirect('/siwake');
}

/**
 * 仕訳番号を生成するServer Action
 */
export async function generateJournalNumberAction(journalDate: string) {
  try {
    const number = await JournalService.generateJournalNumber({ journal_date: journalDate });
    return { number };
  } catch (error) {
    console.error("仕訳番号生成エラー:", error);
    return { error: '仕訳番号の生成に失敗しました。' };
  }
}

/**
 * 仕訳を検索するServer Action
 */
export async function getJournalsAction(
  filter: JournalFilter = {},
  pagination: PaginationParams = {}
) {
  try {
    const result = await JournalService.getJournals(filter, pagination);
    return { data: result.data, pagination: result.pagination };
  } catch (error) {
    console.error("仕訳検索エラー:", error);
    return { error: '仕訳の取得に失敗しました。' };
  }
}

/**
 * 単一仕訳を取得するServer Action
 */
export async function getJournalByIdAction(journalNumber: string) {
  try {
    const journal = await JournalService.getJournalByNumber(journalNumber);
    return { data: journal };
  } catch (error) {
    console.error("単一仕訳取得エラー:", error);
    return { error: '仕訳の詳細取得に失敗しました。' };
  }
} 