/**
 * 仕訳添付ファイルダウンロード API Route
 * ============================================================================
 * ファイルの安全なダウンロード処理
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function GET(
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

    // セキュリティチェック（必要に応じて認証・認可処理を追加）
    // TODO: ユーザー認証とアクセス権限の確認を実装
    // 例: ファイルの所有者や同じ組織のユーザーのみアクセス可能

    try {
      // UploadThingのファイルURLから直接ダウンロード
      const fileResponse = await fetch(attachment.fileUrl);
      
      if (!fileResponse.ok) {
        return NextResponse.json(
          { error: "ファイルの取得に失敗しました" },
          { status: 500 }
        );
      }

      const fileBlob = await fileResponse.blob();
      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      // レスポンスヘッダーを設定
      const headers = new Headers();
      headers.set("Content-Type", attachment.mimeType);
      headers.set("Content-Length", buffer.length.toString());
      headers.set(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName)}`
      );
      headers.set("Cache-Control", "no-cache");

      return new NextResponse(buffer, { headers });

    } catch (error) {
      console.error("ファイルダウンロードエラー:", error);
      return NextResponse.json(
        { error: "ファイルのダウンロードに失敗しました" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("ダウンロード処理エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// プリビュー表示用のGETエンドポイント（画像ファイル等）
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;

    const attachment = await prisma.journalAttachment.findUnique({
      where: { attachmentId },
      select: {
        mimeType: true,
        fileSize: true,
        originalFileName: true,
      },
    });

    if (!attachment) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", attachment.mimeType);
    headers.set("Content-Length", attachment.fileSize.toString());
    headers.set("Accept-Ranges", "bytes");

    return new NextResponse(null, { headers });

  } catch (error) {
    console.error("ファイル情報取得エラー:", error);
    return new NextResponse(null, { status: 500 });
  }
}