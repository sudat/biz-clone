"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { createPartnerSchema, updatePartnerSchema } from "@/lib/schemas/master";
import type { Partner } from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";

/**
 * 取引先コードの重複チェック
 */
export async function checkPartnerCodeExists(partnerCode: string): Promise<{ exists: boolean; partner?: any }> {
  try {
    const existingPartner = await prisma.partner.findUnique({
      where: { partnerCode },
      select: {
        partnerCode: true,
        partnerName: true,
        partnerType: true,
        isActive: true
      }
    });

    return {
      exists: !!existingPartner,
      partner: existingPartner || undefined
    };
  } catch (error) {
    console.error("取引先コード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * 取引先一覧の取得
 */
export async function getPartners() {
  try {
    const partners = await prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { partnerCode: 'asc' }
    });
    
    // 日時を日本時間に変換
    const partnersForClient = partners.map(partner => ({
      ...partner,
      createdAt: toJST(partner.createdAt),
      updatedAt: toJST(partner.updatedAt),
    }));
    
    return { success: true, data: partnersForClient };
  } catch (error) {
    console.error('取引先取得エラー:', error);
    return { success: false, error: '取引先の取得に失敗しました' };
  }
}

/**
 * 取引先の作成
 */
export async function createPartner(formData: FormData): Promise<ActionResult<Partner>> {
  try {
    const data = {
      partnerCode: formData.get('partnerCode') as string,
      partnerName: formData.get('partnerName') as string,
      partnerKana: formData.get('partnerKana') as string,
      partnerType: formData.get('partnerType') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      address: formData.get('address') as string || null,
    };

    const result = createPartnerSchema.safeParse(data);
    if (!result.success) {
      return { 
        success: false, 
        error: {
          type: "validation" as const,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false
          }
        }
      };
    }

    const partner = await prisma.partner.create({
      data: {
        ...result.data,
        isActive: true,
      }
    });

    revalidatePath('/master/partners');
    return { success: true, data: partner };
  } catch (error) {
    return handleServerActionError(error, "取引先の作成", "取引先");
  }
}

/**
 * 取引先の更新
 */
export async function updatePartner(partnerCode: string, formData: FormData): Promise<ActionResult<Partner>> {
  try {
    const data = {
      partnerName: formData.get('partnerName') as string,
      partnerKana: formData.get('partnerKana') as string,
      partnerType: formData.get('partnerType') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      address: formData.get('address') as string || null,
    };

    const result = updatePartnerSchema.safeParse(data);
    if (!result.success) {
      return { 
        success: false, 
        error: {
          type: "validation" as const,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false
          }
        }
      };
    }

    const partner = await prisma.partner.update({
      where: { partnerCode },
      data: result.data
    });

    revalidatePath('/master/partners');
    return { success: true, data: partner };
  } catch (error) {
    return handleServerActionError(error, "取引先の更新", "取引先");
  }
}

/**
 * 取引先の削除
 */
export async function deletePartner(partnerCode: string): Promise<ActionResult> {
  try {
    await prisma.partner.update({
      where: { partnerCode },
      data: { isActive: false }
    });

    revalidatePath('/master/partners');
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "取引先の削除", "取引先");
  }
}

/**
 * 取引先の検索
 */
export async function searchPartners(searchTerm: string, filters: Record<string, any> = {}) {
  try {
    const partners = await prisma.partner.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        ...(searchTerm && {
          OR: [
            { partnerCode: { contains: searchTerm, mode: 'insensitive' } },
            { partnerName: { contains: searchTerm, mode: 'insensitive' } },
            { partnerKana: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }),
        ...(filters.partnerType && {
          partnerType: filters.partnerType
        })
      },
      orderBy: { partnerCode: 'asc' }
    });
    
    // 日時を日本時間に変換
    const partnersForClient = partners.map(partner => ({
      ...partner,
      createdAt: toJST(partner.createdAt),
      updatedAt: toJST(partner.updatedAt),
    }));
    
    return { success: true, data: partnersForClient };
  } catch (error) {
    console.error('取引先検索エラー:', error);
    return { success: false, error: '取引先の検索に失敗しました' };
  }
}