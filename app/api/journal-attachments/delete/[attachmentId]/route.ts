/**
 * 仕訳添付ファイル削除 API Route
 * ============================================================================
 * ファイルの削除処理（UploadThingとDBの両方から削除）
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;

    // 添付ファイル情報を取得
    const attachment = await prisma.journalAttachment.findUnique({
      where: { attachmentId },
      include: {
        journalHeader: {
          select: {
            journalNumber: true,
            createdBy: true,
            approvalStatus: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 404 }
      );
    }

    // セキュリティチェック
    // TODO: ユーザー認証とアクセス権限の確認を実装
    // 例: 承認済みの仕訳のファイルは削除不可、作成者のみ削除可能など

    try {
      // データベースから削除
      await prisma.journalAttachment.delete({
        where: { attachmentId },
      });

      // TODO: UploadThingからファイルを削除
      // UploadThingのファイル削除APIを呼び出す処理が必要
      console.log("削除対象ファイルURL:", attachment.fileUrl);

      // キャッシュ更新
      revalidatePath("/siwake");
      revalidatePath("/siwake/shokai");

      return NextResponse.json({
        success: true,
        message: "ファイルを削除しました",
        deletedFile: {
          attachmentId: attachment.attachmentId,
          originalFileName: attachment.originalFileName,
        },
      });

    } catch (error) {
      console.error("ファイル削除エラー:", error);
      return NextResponse.json(
        { error: "ファイルの削除に失敗しました" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("削除処理エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}