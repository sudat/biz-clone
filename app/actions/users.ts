"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  updateUserSchema,
} from "@/lib/schemas/master/users";
import type { User } from "@/lib/database/prisma";
import { handleServerActionError } from "@/lib/utils/error-handler";
import type { ActionResult } from "@/lib/types/errors";
import { ErrorType } from "@/lib/types/errors";
import { toJST } from "@/lib/utils/date-utils";
import bcrypt from "bcrypt";

// ====================
// ユーザマスタのシンプルなServer Actions
// ====================

// Client Component用のユーザ型（パスワードハッシュは除外）
export type UserForClient = Omit<User, "passwordHash"> & {
  createdAt: Date;
  updatedAt: Date;
  role?: {
    roleName: string;
  };
};

// ログイン履歴型
export type LoginHistory = {
  userId: string;
  loginAt: Date;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * ユーザ一覧の取得（完全camelCase対応）
 */
export async function getUsers(): Promise<
  { success: boolean; data?: UserForClient[]; error?: string }
> {
  try {
    const users = await prisma.user.findMany({
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        roleCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
      orderBy: [
        { userCode: "asc" },
      ],
    });

    // 日時を日本時間に変換
    const usersForClient: UserForClient[] = users.map((user) => ({
      ...user,
      createdAt: toJST(user.createdAt),
      updatedAt: toJST(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? toJST(user.lastLoginAt) : null,
    }));

    return { success: true, data: usersForClient };
  } catch (error) {
    console.error("ユーザ取得エラー:", error);
    return { success: false, error: "ユーザの取得に失敗しました" };
  }
}

/**
 * ユーザIDによるユーザ取得
 */
export async function getUserById(
  userId: string,
): Promise<{ success: boolean; data?: UserForClient; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        roleCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "指定されたユーザが見つかりません" };
    }

    const userForClient: UserForClient = {
      ...user,
      createdAt: toJST(user.createdAt),
      updatedAt: toJST(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? toJST(user.lastLoginAt) : null,
    };

    return { success: true, data: userForClient };
  } catch (error) {
    console.error("ユーザ取得エラー:", error);
    return { success: false, error: "ユーザの取得に失敗しました" };
  }
}

/**
 * ユーザコードの重複チェック
 */
export async function checkUserCodeExists(
  userCode: string,
): Promise<{ exists: boolean; user?: any }> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { userCode },
      select: {
        userCode: true,
        userName: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingUser,
      user: existingUser || undefined,
    };
  } catch (error) {
    console.error("ユーザコード重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * メールアドレスの重複チェック
 */
export async function checkEmailExists(
  email: string,
  excludeUserId?: string,
): Promise<{ exists: boolean; user?: any }> {
  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
      },
      select: {
        userCode: true,
        userName: true,
        email: true,
        isActive: true,
      },
    });

    return {
      exists: !!existingUser,
      user: existingUser || undefined,
    };
  } catch (error) {
    console.error("メールアドレス重複チェックエラー:", error);
    return { exists: false };
  }
}

/**
 * パスワードのハッシュ化
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * パスワードの検証
 */
async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * ユーザの作成
 */
export async function createUser(
  formData: FormData,
): Promise<ActionResult<UserForClient>> {
  const data = {
    userCode: formData.get("userCode") as string,
    userName: formData.get("userName") as string,
    userKana: formData.get("userKana") as string || undefined,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    roleCode: formData.get("roleCode") as string,
  };

  try {
    // バリデーション
    const result = createUserSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // ユーザコードの重複チェック
    const { exists: userCodeExists } = await checkUserCodeExists(
      result.data.userCode,
    );
    if (userCodeExists) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "このユーザーコードは既に使用されています",
          details: {
            fieldErrors: {
              userCode: ["このユーザーコードは既に使用されています"],
            },
            retryable: false,
          },
        },
      };
    }

    // メールアドレスの重複チェック
    const { exists: emailExists } = await checkEmailExists(result.data.email);
    if (emailExists) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "このメールアドレスは既に使用されています",
          details: {
            fieldErrors: {
              email: ["このメールアドレスは既に使用されています"],
            },
            retryable: false,
          },
        },
      };
    }

    // ロールの存在チェック
    const role = await prisma.role.findFirst({
      where: {
        roleCode: result.data.roleCode,
        isActive: true,
      },
    });

    if (!role) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "指定されたロールが見つかりません",
          details: {
            fieldErrors: { roleCode: ["指定されたロールが見つかりません"] },
            retryable: false,
          },
        },
      };
    }

    // パスワードのハッシュ化
    const passwordHash = await hashPassword(result.data.password);

    // データベース登録
    const user = await prisma.user.create({
      data: {
        userCode: result.data.userCode,
        userName: result.data.userName,
        userKana: result.data.userKana || null,
        email: result.data.email,
        passwordHash,
        roleCode: result.data.roleCode,
        isActive: true,
        lastLoginAt: null,
      },
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        roleCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
    });

    const userForClient: UserForClient = {
      ...user,
      createdAt: toJST(user.createdAt),
      updatedAt: toJST(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? toJST(user.lastLoginAt) : null,
    };

    revalidatePath("/master/users");
    return { success: true, data: userForClient };
  } catch (error) {
    return handleServerActionError(error, "ユーザの作成", "ユーザ");
  }
}

/**
 * ユーザの更新
 */
export async function updateUser(
  userId: string,
  formData: FormData,
): Promise<ActionResult<UserForClient>> {
  try {
    console.log("=== updateUser Server Action デバッグ ===");
    console.log("受信したuserId:", userId);
    console.log("受信したFormData:", Array.from(formData.entries()));

    // FormDataから全フィールドを取得
    const data = {
      userName: formData.get("userName") as string,
      userKana: formData.get("userKana") as string || undefined,
      email: formData.get("email") as string,
      roleCode: formData.get("roleCode") as string,
      isActive: formData.get("isActive") === "true",
    };

    // バリデーション
    const validationData = {
      userName: data.userName,
      userKana: data.userKana,
      email: data.email,
      roleCode: data.roleCode,
    };

    const result = updateUserSchema.safeParse(validationData);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // メールアドレスの重複チェック（自分以外）
    const { exists: emailExists } = await checkEmailExists(
      result.data.email,
      userId,
    );
    if (emailExists) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "このメールアドレスは既に使用されています",
          details: {
            fieldErrors: {
              email: ["このメールアドレスは既に使用されています"],
            },
            retryable: false,
          },
        },
      };
    }

    // ロールの存在チェック
    const role = await prisma.role.findFirst({
      where: {
        roleCode: result.data.roleCode,
        isActive: true,
      },
    });

    if (!role) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "指定されたロールが見つかりません",
          details: {
            fieldErrors: { roleCode: ["指定されたロールが見つかりません"] },
            retryable: false,
          },
        },
      };
    }

    // ユーザ存在チェック
    const existingUser = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!existingUser) {
      return {
        success: false,
        error: {
          type: ErrorType.NOT_FOUND,
          message: "指定されたユーザが見つかりません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // データベース更新
    const user = await prisma.user.update({
      where: { userId },
      data: {
        userName: data.userName,
        userKana: data.userKana || null,
        email: data.email,
        roleCode: data.roleCode,
        isActive: data.isActive,
      },
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        roleCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
    });

    // UserForClient型に変換
    const userForClient: UserForClient = {
      ...user,
      createdAt: toJST(user.createdAt),
      updatedAt: toJST(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? toJST(user.lastLoginAt) : null,
    };

    revalidatePath("/master/users");
    return { success: true, data: userForClient };
  } catch (error) {
    return handleServerActionError(error, "ユーザの更新", "ユーザ");
  }
}

/**
 * パスワード変更
 */
export async function changePassword(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const data = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmNewPassword: formData.get("confirmNewPassword") as string,
    };

    // バリデーション
    const result = changePasswordSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // 現在のユーザ情報取得
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return {
        success: false,
        error: {
          type: ErrorType.NOT_FOUND,
          message: "ユーザが見つかりません",
          details: { retryable: false },
        },
      };
    }

    // 現在のパスワード検証
    const isCurrentPasswordValid = await verifyPassword(
      result.data.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "現在のパスワードが正しくありません",
          details: {
            fieldErrors: {
              currentPassword: ["現在のパスワードが正しくありません"],
            },
            retryable: false,
          },
        },
      };
    }

    // 新しいパスワードのハッシュ化
    const newPasswordHash = await hashPassword(result.data.newPassword);

    // パスワード更新
    await prisma.user.update({
      where: { userId },
      data: { passwordHash: newPasswordHash },
    });

    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "パスワードの変更", "パスワード");
  }
}

/**
 * ユーザの削除（物理削除）
 */
export async function deleteUser(
  userId: string,
): Promise<ActionResult> {
  try {
    // ユーザの存在チェック
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userCode: true, userName: true },
    });

    if (!user) {
      return {
        success: false,
        error: {
          type: ErrorType.NOT_FOUND,
          message: "ユーザが見つかりません",
          details: { retryable: false },
        },
      };
    }

    // ワークフロー組織ユーザへの関連データ存在チェック
    const workflowOrganizationUserCount = await prisma.workflowOrganizationUser.count({
      where: { userId },
    });

    if (workflowOrganizationUserCount > 0) {
      return {
        success: false,
        error: {
          type: ErrorType.BUSINESS,
          message: "このユーザは使用中のため削除できません",
          details: {
            retryable: false,
          },
        },
      };
    }

    // 物理削除
    await prisma.user.delete({
      where: { userId },
    });

    revalidatePath("/master/users");
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "ユーザの削除", "ユーザ");
  }
}

/**
 * ユーザ認証（ログイン）
 */
export async function authenticateUser(
  formData: FormData,
): Promise<ActionResult<UserForClient>> {
  try {
    const data = {
      userCode: formData.get("userCode") as string,
      password: formData.get("password") as string,
    };

    // バリデーション
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "入力値が正しくありません",
          details: {
            fieldErrors: result.error.formErrors.fieldErrors,
            retryable: false,
          },
        },
      };
    }

    // ユーザ情報取得
    const user = await prisma.user.findUnique({
      where: {
        userCode: result.data.userCode,
        isActive: true,
      },
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        passwordHash: true,
        roleCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "ユーザーコードまたはパスワードが正しくありません",
          details: { retryable: false },
        },
      };
    }

    // パスワード検証
    const isPasswordValid = await verifyPassword(
      result.data.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: "ユーザーコードまたはパスワードが正しくありません",
          details: { retryable: false },
        },
      };
    }

    // ログイン時刻を更新
    await prisma.user.update({
      where: { userId: user.userId },
      data: { lastLoginAt: new Date() },
    });

    // レスポンス用のユーザ情報（パスワードハッシュを除外）
    const userForClient: UserForClient = {
      userId: user.userId,
      userCode: user.userCode,
      userName: user.userName,
      userKana: user.userKana,
      email: user.email,
      roleCode: user.roleCode,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ? toJST(user.lastLoginAt) : null,
      createdAt: toJST(user.createdAt),
      updatedAt: toJST(user.updatedAt),
      role: user.role,
    };

    return { success: true, data: userForClient };
  } catch (error) {
    return handleServerActionError(error, "ユーザ認証", "認証");
  }
}

/**
 * ユーザの検索（完全camelCase対応）
 */
export async function searchUsers(
  searchTerm: string,
  filters: { isActive?: boolean; roleCode?: string } = {},
): Promise<{ success: boolean; data?: UserForClient[]; error?: string }> {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        roleCode: filters.roleCode || undefined,
        ...(searchTerm && {
          OR: [
            { userCode: { contains: searchTerm, mode: "insensitive" } },
            { userName: { contains: searchTerm, mode: "insensitive" } },
            { userKana: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        roleCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
      orderBy: [
        { userCode: "asc" },
      ],
    });

    // 日時を日本時間に変換
    const usersForClient: UserForClient[] = users.map((user) => ({
      ...user,
      createdAt: toJST(user.createdAt),
      updatedAt: toJST(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? toJST(user.lastLoginAt) : null,
    }));

    return { success: true, data: usersForClient };
  } catch (error) {
    console.error("ユーザ検索エラー:", error);
    return { success: false, error: "ユーザの検索に失敗しました" };
  }
}

/**
 * アクティブなユーザ一覧の取得（選択肢用）
 */
export async function getActiveUsers(): Promise<
  {
    success: boolean;
    data?: UserForClient[];
    error?: string;
  }
> {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        userId: true,
        userCode: true,
        userName: true,
        userKana: true,
        email: true,
        roleCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
      orderBy: [
        { userCode: "asc" },
      ],
    });

    // UserForClient型に変換
    const userForClientList: UserForClient[] = users.map(user => ({
      userId: user.userId,
      userCode: user.userCode,
      userName: user.userName,
      userKana: user.userKana,
      email: user.email,
      roleCode: user.roleCode,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return { success: true, data: userForClientList };
  } catch (error) {
    console.error("アクティブユーザ取得エラー:", error);
    return { success: false, error: "アクティブユーザの取得に失敗しました" };
  }
}

/**
 * 最終ログイン時刻の更新
 */
export async function updateLastLogin(
  userId: string,
): Promise<ActionResult> {
  try {
    await prisma.user.update({
      where: { userId },
      data: { lastLoginAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    return handleServerActionError(error, "ログイン時刻の更新", "ログイン時刻");
  }
}
