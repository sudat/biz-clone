-- ============================================================================
-- 会計システム データベーススキーマ (Supabase PostgreSQL)
-- ============================================================================

-- ============================================================================
-- マスタテーブル群 (サブタスク 2.3)
-- ============================================================================

-- 勘定科目マスタ
CREATE TABLE accounts (
    account_code VARCHAR(10) PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('資産', '負債', '資本', '収益', '費用')),
    parent_account_code VARCHAR(10),
    is_detail BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_accounts_parent 
        FOREIGN KEY (parent_account_code) 
        REFERENCES accounts(account_code)
);

-- 補助科目マスタ
CREATE TABLE sub_accounts (
    sub_account_code VARCHAR(15) PRIMARY KEY,
    account_code VARCHAR(10) NOT NULL,
    sub_account_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_sub_accounts_account 
        FOREIGN KEY (account_code) 
        REFERENCES accounts(account_code)
);

-- 取引先マスタ
CREATE TABLE partners (
    partner_code VARCHAR(15) PRIMARY KEY,
    partner_name VARCHAR(100) NOT NULL,
    partner_kana VARCHAR(100),
    partner_type VARCHAR(20) NOT NULL CHECK (partner_type IN ('得意先', '仕入先', '金融機関', 'その他')),
    postal_code VARCHAR(8),
    address VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    contact_person VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 分析コードマスタ
CREATE TABLE analysis_codes (
    analysis_code VARCHAR(15) PRIMARY KEY,
    analysis_name VARCHAR(100) NOT NULL,
    analysis_type VARCHAR(20) NOT NULL,
    parent_analysis_code VARCHAR(15),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_analysis_codes_parent 
        FOREIGN KEY (parent_analysis_code) 
        REFERENCES analysis_codes(analysis_code)
);

-- ============================================================================
-- 仕訳テーブル群 (サブタスク 2.1 & 2.2)
-- ============================================================================

-- 仕訳ヘッダテーブル (サブタスク 2.1)
CREATE TABLE journal_headers (
    journal_number VARCHAR(15) PRIMARY KEY,  -- YYYYMMDDxxxxxxx形式
    journal_date DATE NOT NULL,
    description TEXT,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    
    -- 制約: 仕訳番号の形式チェック
    CONSTRAINT chk_journal_number_format 
        CHECK (journal_number ~ '^[0-9]{8}[0-9]{7}$'),
    
    -- 制約: 合計金額は正数
    CONSTRAINT chk_total_amount_positive 
        CHECK (total_amount >= 0)
);

-- 仕訳明細テーブル (サブタスク 2.2)
CREATE TABLE journal_details (
    journal_number VARCHAR(15) NOT NULL,
    line_number INTEGER NOT NULL,
    debit_credit VARCHAR(1) NOT NULL CHECK (debit_credit IN ('D', 'C')),  -- D:借方, C:貸方
    account_code VARCHAR(10) NOT NULL,
    sub_account_code VARCHAR(15),
    partner_code VARCHAR(15),
    analysis_code VARCHAR(15),
    amount DECIMAL(15,2) NOT NULL,
    line_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 複合主キー
    PRIMARY KEY (journal_number, line_number),
    
    -- 外部キー制約
    CONSTRAINT fk_journal_details_header 
        FOREIGN KEY (journal_number) 
        REFERENCES journal_headers(journal_number) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_journal_details_account 
        FOREIGN KEY (account_code) 
        REFERENCES accounts(account_code),
    
    CONSTRAINT fk_journal_details_sub_account 
        FOREIGN KEY (sub_account_code) 
        REFERENCES sub_accounts(sub_account_code),
    
    CONSTRAINT fk_journal_details_partner 
        FOREIGN KEY (partner_code) 
        REFERENCES partners(partner_code),
    
    CONSTRAINT fk_journal_details_analysis 
        FOREIGN KEY (analysis_code) 
        REFERENCES analysis_codes(analysis_code),
    
    -- 制約: 金額は正数
    CONSTRAINT chk_amount_positive 
        CHECK (amount > 0),
    
    -- 制約: 行番号は正数
    CONSTRAINT chk_line_number_positive 
        CHECK (line_number > 0)
);

-- ============================================================================
-- インデックス作成 (サブタスク 2.5)
-- ============================================================================

-- 日付範囲検索用インデックス
CREATE INDEX idx_journal_headers_date ON journal_headers(journal_date);

-- 勘定科目別検索用インデックス
CREATE INDEX idx_journal_details_account ON journal_details(account_code);

-- 取引先別検索用インデックス
CREATE INDEX idx_journal_details_partner ON journal_details(partner_code);

-- 分析コード別検索用インデックス
CREATE INDEX idx_journal_details_analysis ON journal_details(analysis_code);

-- 仕訳明細複合検索用インデックス
CREATE INDEX idx_journal_details_composite ON journal_details(journal_number, debit_credit, account_code);

-- マスタテーブル名称検索用インデックス (全文検索対応)
CREATE INDEX idx_accounts_name_gin ON accounts USING gin(to_tsvector('japanese', account_name));
CREATE INDEX idx_partners_name_gin ON partners USING gin(to_tsvector('japanese', partner_name));
CREATE INDEX idx_sub_accounts_name_gin ON sub_accounts USING gin(to_tsvector('japanese', sub_account_name));
CREATE INDEX idx_analysis_codes_name_gin ON analysis_codes USING gin(to_tsvector('japanese', analysis_name));

-- ソート用インデックス
CREATE INDEX idx_accounts_sort ON accounts(sort_order, account_code);
CREATE INDEX idx_sub_accounts_sort ON sub_accounts(account_code, sort_order, sub_account_code);
CREATE INDEX idx_partners_kana ON partners(partner_kana);
CREATE INDEX idx_analysis_codes_sort ON analysis_codes(analysis_type, sort_order, analysis_code);

-- ============================================================================
-- 制約関数とトリガー
-- ============================================================================

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新日時トリガーを設定
CREATE TRIGGER trigger_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sub_accounts_updated_at 
    BEFORE UPDATE ON sub_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_partners_updated_at 
    BEFORE UPDATE ON partners 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_analysis_codes_updated_at 
    BEFORE UPDATE ON analysis_codes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_journal_headers_updated_at 
    BEFORE UPDATE ON journal_headers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_journal_details_updated_at 
    BEFORE UPDATE ON journal_details 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 仕訳番号自動採番関数 (Task 5関連)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_journal_number(journal_date DATE)
RETURNS VARCHAR(15) AS $$
DECLARE
    date_prefix VARCHAR(8);
    sequence_num INTEGER;
    formatted_num VARCHAR(7);
    new_journal_number VARCHAR(15);
BEGIN
    -- 日付プレフィックス生成 (YYYYMMDD)
    date_prefix := TO_CHAR(journal_date, 'YYYYMMDD');
    
    -- 同日の最大連番を取得
    SELECT COALESCE(MAX(CAST(RIGHT(journal_number, 7) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM journal_headers
    WHERE LEFT(journal_number, 8) = date_prefix;
    
    -- 7桁の連番フォーマット
    formatted_num := LPAD(sequence_num::TEXT, 7, '0');
    
    -- 完全な仕訳番号を生成
    new_journal_number := date_prefix || formatted_num;
    
    RETURN new_journal_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- コメント追加
-- ============================================================================

COMMENT ON TABLE accounts IS '勘定科目マスタ';
COMMENT ON TABLE sub_accounts IS '補助科目マスタ';
COMMENT ON TABLE partners IS '取引先マスタ';
COMMENT ON TABLE analysis_codes IS '分析コードマスタ';
COMMENT ON TABLE journal_headers IS '仕訳ヘッダテーブル';
COMMENT ON TABLE journal_details IS '仕訳明細テーブル';

COMMENT ON COLUMN journal_headers.journal_number IS 'YYYYMMDDxxxxxxx形式の仕訳番号';
COMMENT ON COLUMN journal_details.debit_credit IS 'D:借方, C:貸方';
COMMENT ON COLUMN journal_details.amount IS '金額（正数のみ）';
