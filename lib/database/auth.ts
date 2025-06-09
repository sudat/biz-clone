import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRoleType, PermissionAction, PermissionCheck } from "./types";

/**
 * 認証と権限管理サービス
 */
export class AuthService {
  /**
   * 現在のユーザーのロールを取得する
   * @returns Promise<UserRoleType | null>
   */
  static async getCurrentUserRole(): Promise<UserRoleType | null> {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error("ユーザー情報取得エラー:", error.message);
      return null;
    }

    if (!user) {
      return null; // ユーザーが認証されていない場合
    }

    // データベース関数を呼び出してユーザーロールを取得
    const { data: role, error: rpcError } = await supabase.rpc('get_current_user_role');

    if (rpcError) {
      console.error("ユーザーロール取得RPCエラー:", rpcError.message);
      return null;
    }

    // RPC関数の戻り値はstring型なので、UserRoleTypeにキャスト
    return role as UserRoleType || null;
  }

  /**
   * 指定されたアクションとリソースに対してユーザーが権限を持っているかチェックする
   * @param action 実行しようとしているアクション ('read', 'create', 'update', 'delete')
   * @param resource 対象のリソース ('accounts', 'partners', 'journal', 'user_roles')
   * @returns Promise<boolean>
   */
  static async hasPermission(
    action: PermissionAction,
    resource: PermissionCheck['resource']
  ): Promise<boolean> {
    const currentUserRole = await AuthService.getCurrentUserRole();
    if (!currentUserRole) {
      return false; // ユーザーが認証されていない場合は権限なし
    }

    // クライアントサイドの権限マップを使用してチェック
    return AuthService.checkRolePermission(currentUserRole, action, resource);
  }

  /**
   * 指定されたロールを持つユーザーが特定の権限を持つかチェックする（RLSデバッグ用）
   * @param userRoleToCheck チェックするユーザーロール
   * @param action 実行しようとしているアクション
   * @param resource 対象のリソース
   * @returns Promise<boolean>
   */
  static async checkRolePermission(
    userRoleToCheck: UserRoleType,
    action: PermissionAction,
    resource: PermissionCheck['resource']
  ): Promise<boolean> {
    // この関数は、RLSポリシーをデバッグしたり、特定のロールが持つべき権限を確認したりする際に使用します。
    // 実際のRLSはデータベース側で適用されるため、これはクライアントサイドでのUI制御や事前チェックに役立ちます。

    // 仮の権限マップ（RLSポリシーと同期させる必要がある）
    const permissionMap: Record<UserRoleType, Record<string, PermissionAction[]>> = {
      admin: {
        accounts: ['read', 'create', 'update', 'delete'],
        partners: ['read', 'create', 'update', 'delete'],
        journal: ['read', 'create', 'update', 'delete'],
        user_roles: ['read', 'create', 'update', 'delete'],
      },
      manager: {
        accounts: ['read', 'create', 'update'],
        partners: ['read', 'create', 'update'],
        journal: ['read', 'create', 'update'],
        user_roles: ['read'],
      },
      user: {
        accounts: ['read'],
        partners: ['read'],
        journal: ['read', 'create'],
        user_roles: [],
      },
    };

    const allowedActions = permissionMap[userRoleToCheck]?.[resource];
    return allowedActions ? allowedActions.includes(action) : false;
  }
} 