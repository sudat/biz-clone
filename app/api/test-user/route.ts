/**
 * テスト用API - 現在ユーザの確認
 */

import { getCurrentUserIdFromCookie } from "@/lib/utils/auth-utils";
import { prisma } from "@/lib/database/prisma";

export async function GET() {
  try {
    const userId = await getCurrentUserIdFromCookie();
    
    if (!userId) {
      return Response.json({ 
        success: false, 
        message: "Cookieからユーザ情報を取得できませんでした",
        userId: null,
        user: null
      });
    }

    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        roleCode: true,
      }
    });

    return Response.json({
      success: true,
      message: "ユーザ情報を正常に取得しました",
      userId,
      user
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      message: "エラーが発生しました",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}