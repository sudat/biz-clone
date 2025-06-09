-- ============================================================================
-- Row Level Security (RLS) ポリシー設定 (サブタスク 2.4)
-- ============================================================================

-- ============================================================================
-- RLS 有効化
-- ============================================================================

-- 全テーブルでRLSを有効化
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_details ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- マスタテーブルRLSポリシー
-- ============================================================================

-- 勘定科目マスタ：すべての認証ユーザーが読み取り可能、管理者のみ更新可能
CREATE POLICY "勘定科目_読み取り許可" ON accounts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "勘定科目_挿入許可" ON accounts
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

CREATE POLICY "勘定科目_更新許可" ON accounts
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

CREATE POLICY "勘定科目_削除許可" ON accounts
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- 補助科目マスタ：勘定科目と同様のポリシー
CREATE POLICY "補助科目_読み取り許可" ON sub_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "補助科目_挿入許可" ON sub_accounts
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

CREATE POLICY "補助科目_更新許可" ON sub_accounts
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

CREATE POLICY "補助科目_削除許可" ON sub_accounts
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- 取引先マスタ：すべての認証ユーザーが読み取り・更新可能
CREATE POLICY "取引先_読み取り許可" ON partners
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "取引先_挿入許可" ON partners
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "取引先_更新許可" ON partners
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "取引先_削除許可" ON partners
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

-- 分析コードマスタ：勘定科目と同様のポリシー
CREATE POLICY "分析コード_読み取り許可" ON analysis_codes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "分析コード_挿入許可" ON analysis_codes
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

CREATE POLICY "分析コード_更新許可" ON analysis_codes
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

CREATE POLICY "分析コード_削除許可" ON analysis_codes
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- ============================================================================
-- 仕訳テーブルRLSポリシー
-- ============================================================================

-- 仕訳ヘッダ：認証ユーザーが読み取り・作成・更新可能、削除は管理者のみ
CREATE POLICY "仕訳ヘッダ_読み取り許可" ON journal_headers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "仕訳ヘッダ_挿入許可" ON journal_headers
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        created_by = auth.uid()
    );

CREATE POLICY "仕訳ヘッダ_更新許可" ON journal_headers
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (created_by = auth.uid() OR 
         auth.jwt() ->> 'user_role' = 'admin' OR 
         auth.jwt() ->> 'user_role' = 'manager')
    );

CREATE POLICY "仕訳ヘッダ_削除許可" ON journal_headers
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

-- 仕訳明細：ヘッダと連動したポリシー
CREATE POLICY "仕訳明細_読み取り許可" ON journal_details
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM journal_headers 
            WHERE journal_headers.journal_number = journal_details.journal_number
        )
    );

CREATE POLICY "仕訳明細_挿入許可" ON journal_details
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM journal_headers 
            WHERE journal_headers.journal_number = journal_details.journal_number 
            AND (journal_headers.created_by = auth.uid() OR 
                 auth.jwt() ->> 'user_role' = 'admin' OR 
                 auth.jwt() ->> 'user_role' = 'manager')
        )
    );

CREATE POLICY "仕訳明細_更新許可" ON journal_details
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM journal_headers 
            WHERE journal_headers.journal_number = journal_details.journal_number 
            AND (journal_headers.created_by = auth.uid() OR 
                 auth.jwt() ->> 'user_role' = 'admin' OR 
                 auth.jwt() ->> 'user_role' = 'manager')
        )
    );

CREATE POLICY "仕訳明細_削除許可" ON journal_details
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'manager')
    );

-- ============================================================================
-- ユーザーロール管理用のテーブルとポリシー
-- ============================================================================

-- ユーザーロール定義テーブル
CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (user_role IN ('admin', 'manager', 'user')),
    department VARCHAR(50),
    company_code VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ユーザーロールテーブルのRLS設定
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーロール_読み取り許可" ON user_roles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (user_id = auth.uid() OR auth.jwt() ->> 'user_role' = 'admin')
    );

CREATE POLICY "ユーザーロール_挿入許可" ON user_roles
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'user_role' = 'admin'
    );

CREATE POLICY "ユーザーロール_更新許可" ON user_roles
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- ユーザーロール更新トリガー
CREATE TRIGGER trigger_user_roles_updated_at 
    BEFORE UPDATE ON user_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- セキュリティ関数
-- ============================================================================

-- 現在のユーザーロールを取得する関数
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(auth.jwt() ->> 'user_role', 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーが特定の権限を持っているかチェックする関数
CREATE OR REPLACE FUNCTION has_permission(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_role TEXT;
BEGIN
    current_role := get_current_user_role();
    
    CASE required_role
        WHEN 'admin' THEN
            RETURN current_role = 'admin';
        WHEN 'manager' THEN
            RETURN current_role IN ('admin', 'manager');
        WHEN 'user' THEN
            RETURN current_role IN ('admin', 'manager', 'user');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- コメント追加
-- ============================================================================

COMMENT ON TABLE user_roles IS 'ユーザーロール管理テーブル';
COMMENT ON FUNCTION get_current_user_role() IS '現在のユーザーロールを取得';
COMMENT ON FUNCTION has_permission(TEXT) IS 'ユーザー権限チェック関数';
