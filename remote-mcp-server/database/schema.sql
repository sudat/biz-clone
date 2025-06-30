-- ============================================================================
-- Biz Clone Accounting System - D1 Database Schema
-- ============================================================================

-- 勘定科目マスタ
CREATE TABLE account_master (
    account_code TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    parent_account_code TEXT,
    is_detail INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER,
    is_tax_account INTEGER DEFAULT 0,
    default_tax_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 補助科目マスタ
CREATE TABLE sub_account_master (
    account_code TEXT NOT NULL,
    sub_account_code TEXT NOT NULL,
    sub_account_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_code, sub_account_code),
    FOREIGN KEY (account_code) REFERENCES account_master(account_code)
);

-- 取引先マスタ
CREATE TABLE partner_master (
    partner_code TEXT PRIMARY KEY,
    partner_name TEXT NOT NULL,
    partner_kana TEXT,
    partner_type TEXT,
    postal_code TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    contact_person TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分析コードマスタ
CREATE TABLE analysis_code_master (
    analysis_code TEXT PRIMARY KEY,
    analysis_name TEXT NOT NULL,
    analysis_type TEXT,
    parent_analysis_code TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 税区分マスタ
CREATE TABLE tax_rate_master (
    tax_code TEXT PRIMARY KEY,
    tax_name TEXT NOT NULL,
    tax_rate REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 部門マスタ
CREATE TABLE department_master (
    department_code TEXT PRIMARY KEY,
    department_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 仕訳ヘッダ
CREATE TABLE journal_header (
    journal_number TEXT PRIMARY KEY,
    journal_date DATE NOT NULL,
    description TEXT,
    total_amount REAL DEFAULT 0,
    approval_status TEXT DEFAULT 'pending',
    created_by TEXT,
    approved_by TEXT,
    approved_at DATETIME,
    rejected_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 仕訳明細
CREATE TABLE journal_detail (
    journal_number TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    debit_credit TEXT NOT NULL,
    account_code TEXT NOT NULL,
    sub_account_code TEXT,
    partner_code TEXT,
    analysis_code TEXT,
    department_code TEXT,
    amount REAL NOT NULL,
    base_amount REAL NOT NULL,
    tax_amount REAL DEFAULT 0,
    tax_code TEXT,
    description TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (journal_number, line_number),
    FOREIGN KEY (journal_number) REFERENCES journal_header(journal_number),
    FOREIGN KEY (account_code) REFERENCES account_master(account_code),
    FOREIGN KEY (partner_code) REFERENCES partner_master(partner_code),
    FOREIGN KEY (analysis_code) REFERENCES analysis_code_master(analysis_code),
    FOREIGN KEY (department_code) REFERENCES department_master(department_code),
    FOREIGN KEY (tax_code) REFERENCES tax_rate_master(tax_code)
);

-- 仕訳添付ファイル
CREATE TABLE journal_attachment (
    attachment_id TEXT PRIMARY KEY,
    journal_number TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_extension TEXT,
    mime_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_number) REFERENCES journal_header(journal_number)
);

-- インデックス作成
CREATE INDEX idx_journal_header_date ON journal_header(journal_date);
CREATE INDEX idx_journal_header_status ON journal_header(approval_status);
CREATE INDEX idx_journal_detail_account ON journal_detail(account_code);
CREATE INDEX idx_journal_detail_partner ON journal_detail(partner_code);
CREATE INDEX idx_journal_detail_date ON journal_detail(journal_number);

-- ============================================================================
-- 初期マスタデータ
-- ============================================================================

-- 基本勘定科目
INSERT INTO account_master (account_code, account_name, account_type, is_active) VALUES
('1000', '現金', '資産', 1),
('1100', '普通預金', '資産', 1),
('1200', '売掛金', '資産', 1),
('2000', '買掛金', '負債', 1),
('2100', '未払金', '負債', 1),
('3000', '資本金', '純資産', 1),
('4000', '売上高', '収益', 1),
('5000', '仕入高', '費用', 1),
('5100', '消耗品費', '費用', 1),
('5200', '旅費交通費', '費用', 1);

-- 基本税区分
INSERT INTO tax_rate_master (tax_code, tax_name, tax_rate, is_active) VALUES
('01', '課税売上10%', 10.0, 1),
('02', '課税仕入10%', 10.0, 1),
('03', '非課税', 0.0, 1),
('04', '免税', 0.0, 1),
('05', '不課税', 0.0, 1);

-- 基本取引先
INSERT INTO partner_master (partner_code, partner_name, partner_type, is_active) VALUES
('C001', 'サンプル顧客', '得意先', 1),
('S001', 'サンプル仕入先', '仕入先', 1);

-- 基本部門
INSERT INTO department_master (department_code, department_name, is_active) VALUES
('D001', '営業部', 1),
('D002', '経理部', 1),
('D003', '総務部', 1);

-- 基本分析コード
INSERT INTO analysis_code_master (analysis_code, analysis_name, analysis_type, is_active) VALUES
('P001', 'プロジェクトA', 'プロジェクト', 1),
('P002', 'プロジェクトB', 'プロジェクト', 1); 