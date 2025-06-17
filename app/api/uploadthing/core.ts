import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for UploadThing
export const ourFileRouter = {
  // 仕訳添付ファイル用のアップローダー
  journalAttachment: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
    text: { maxFileSize: "2MB", maxFileCount: 5 },
    blob: { maxFileSize: "8MB", maxFileCount: 5 }, // XLSXやDOCXなどのOfficeファイル用
  })
    .middleware(async ({ req }) => {
      // TODO: 認証が実装された場合、ここでユーザー認証をチェック
      // const user = await auth(req);
      // if (!user) throw new UploadThingError("Unauthorized");

      return { userId: "user" }; // 認証実装まで仮のユーザーID
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // ファイルアップロード完了時の処理
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      // データベースに添付ファイル情報を保存する処理を今後追加
      // await db.attachment.create({
      //   data: {
      //     fileName: file.name,
      //     fileUrl: file.url,
      //     fileSize: file.size,
      //     fileType: file.type,
      //     uploadedBy: metadata.userId,
      //   }
      // })

      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),

  // レシート・領収書用のアップローダー
  receiptUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 10 },
    pdf: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .middleware(async ({ req }) => {
      // TODO: 認証が実装された場合、ここでユーザー認証をチェック
      return { userId: "user" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Receipt upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
