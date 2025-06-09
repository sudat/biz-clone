-- ============================================================================
-- テストデータ・サンプルデータ投入 (サブタスク 2.6)
-- ============================================================================

-- ============================================================================
-- マスタデータ投入
-- ============================================================================

-- 勘定科目マスタ（基本的な勘定科目）
INSERT INTO accounts (account_code, account_name, account_type, parent_account_code, is_detail, sort_order) VALUES
-- 資産
('100', '資産', '資産', NULL, false, 100),
('101', '流動資産', '資産', '100', false, 101),
('1011', '現金', '資産', '101', true, 1011),
('1012', '普通預金', '資産', '101', true, 1012),
('1013', '当座預金', '資産', '101', true, 1013),
('1021', '売掛金', '資産', '101', true, 1021),
('1031', '商品', '資産', '101', true, 1031),
('102', '固定資産', '資産', '100', false, 102),
('1021', '建物', '資産', '102', true, 1021),
('1022', '機械装置', '資産', '102', true, 1022),

-- 負債
('200', '負債', '負債', NULL, false, 200),
('201', '流動負債', '負債', '200', false, 201),
('2011', '買掛金', '負債', '201', true, 2011),
('2012', '短期借入金', '負債', '201', true, 2012),
('2013', '未払金', '負債', '201', true, 2013),
('202', '固定負債', '負債', '200', false, 202),
('2021', '長期借入金', '負債', '202', true, 2021),

-- 純資産
('300', '純資産', '資本', NULL, false, 300),
('3011', '資本金', '資本', '300', true, 3011),
('3012', '利益剰余金', '資本', '300', true, 3012),

-- 収益
('400', '収益', '収益', NULL, false, 400),
('4011', '売上高', '収益', '400', true, 4011),
('4012', '受取利息', '収益', '400', true, 4012),

-- 費用
('500', '費用', '費用', NULL, false, 500),
('5011', '売上原価', '費用', '500', true, 5011),
('5012', '給料手当', '費用', '500', true, 5012),
('5013', '地代家賃', '費用', '500', true, 5013),
('5014', '水道光熱費', '費用', '500', true, 5014),
('5015', '通信費', '費用', '500', true, 5015);

-- 補助科目マスタ
INSERT INTO sub_accounts (sub_account_code, account_code, sub_account_name, sort_order) VALUES
('1012-001', '1012', 'みずほ銀行', 1),
('1012-002', '1012', '三菱UFJ銀行', 2),
('1012-003', '1012', '三井住友銀行', 3),
('1013-001', '1013', 'みずほ銀行当座', 1),
('2012-001', '2012', 'みずほ銀行短期借入', 1),
('2021-001', '2021', 'みずほ銀行長期借入', 1);

-- 取引先マスタ
INSERT INTO partners (partner_code, partner_name, partner_kana, partner_type, postal_code, address, phone, email) VALUES
('C001', 'ABC商事株式会社', 'エービーシーショウジ', '得意先', '100-0001', '東京都千代田区千代田1-1-1', '03-1234-5678', 'contact@abc-trading.co.jp'),
('C002', 'XYZ製造株式会社', 'エックスワイゼットセイゾウ', '得意先', '530-0001', '大阪府大阪市北区梅田1-1-1', '06-1234-5678', 'info@xyz-mfg.co.jp'),
('S001', 'DEF卸売株式会社', 'ディーイーエフオロシウリ', '仕入先', '460-0001', '愛知県名古屋市中区三の丸1-1-1', '052-123-4567', 'sales@def-wholesale.co.jp'),
('S002', 'GHI物産株式会社', 'ジーエイチアイブッサン', '仕入先', '810-0001', '福岡県福岡市中央区天神1-1-1', '092-123-4567', 'order@ghi-bussan.co.jp'),
('B001', 'みずほ銀行', 'ミズホギンコウ', '金融機関', '100-0006', '東京都千代田区有楽町1-1-2', '0120-324-555', NULL),
('B002', '三菱UFJ銀行', 'ミツビシユーエフジェイギンコウ', '金融機関', '100-0005', '東京都千代田区丸の内2-7-1', '0120-860-777', NULL),
('O001', '田中太郎', 'タナカタロウ', 'その他', NULL, NULL, NULL, 'tanaka@example.com');

-- 分析コードマスタ
INSERT INTO analysis_codes (analysis_code, analysis_name, analysis_type, sort_order) VALUES
-- 部門コード
('DEPT001', '営業部', '部門', 1),
('DEPT002', '製造部', '部門', 2),
('DEPT003', '管理部', '部門', 3),
('DEPT004', '開発部', '部門', 4),
-- プロジェクトコード
('PROJ001', 'プロジェクトA', 'プロジェクト', 1),
('PROJ002', 'プロジェクトB', 'プロジェクト', 2),
('PROJ003', 'プロジェクトC', 'プロジェクト', 3),
-- 地域コード
('AREA001', '東京', '地域', 1),
('AREA002', '大阪', '地域', 2),
('AREA003', '名古屋', '地域', 3);

-- ============================================================================
-- サンプル仕訳データ
-- ============================================================================

-- サンプル仕訳 1: 商品売上
INSERT INTO journal_headers (journal_number, journal_date, description, total_amount, created_by)
VALUES ('202401010000001', '2024-01-01', '商品売上', 110000.00, NULL);

INSERT INTO journal_details (journal_number, line_number, debit_credit, account_code, sub_account_code, partner_code, analysis_code, amount, line_description) VALUES
('202401010000001', 1, 'D', '1021', NULL, 'C001', 'DEPT001', 110000.00, '商品売上（税込）'),
('202401010000001', 2, 'C', '4011', NULL, 'C001', 'DEPT001', 100000.00, '商品売上'),
('202401010000001', 3, 'C', '2013', NULL, NULL, NULL, 10000.00, '消費税預り金');

-- サンプル仕訳 2: 現金売上
INSERT INTO journal_headers (journal_number, journal_date, description, total_amount, created_by)
VALUES ('202401010000002', '2024-01-01', '現金売上', 55000.00, NULL);

INSERT INTO journal_details (journal_number, line_number, debit_credit, account_code, sub_account_code, partner_code, analysis_code, amount, line_description) VALUES
('202401010000002', 1, 'D', '1011', NULL, NULL, 'DEPT001', 55000.00, '現金売上（税込）'),
('202401010000002', 2, 'C', '4011', NULL, NULL, 'DEPT001', 50000.00, '商品売上'),
('202401010000002', 3, 'C', '2013', NULL, NULL, NULL, 5000.00, '消費税預り金');

-- サンプル仕訳 3: 商品仕入
INSERT INTO journal_headers (journal_number, journal_date, description, total_amount, created_by)
VALUES ('202401020000001', '2024-01-02', '商品仕入', 33000.00, NULL);

INSERT INTO journal_details (journal_number, line_number, debit_credit, account_code, sub_account_code, partner_code, analysis_code, amount, line_description) VALUES
('202401020000001', 1, 'D', '5011', NULL, 'S001', 'DEPT002', 30000.00, '商品仕入'),
('202401020000001', 2, 'D', '2013', NULL, NULL, NULL, 3000.00, '消費税仮払金'),
('202401020000001', 3, 'C', '2011', NULL, 'S001', NULL, 33000.00, '買掛金');

-- サンプル仕訳 4: 給料支払
INSERT INTO journal_headers (journal_number, journal_date, description, total_amount, created_by)
VALUES ('202401250000001', '2024-01-25', '給料支払', 500000.00, NULL);

INSERT INTO journal_details (journal_number, line_number, debit_credit, account_code, sub_account_code, partner_code, analysis_code, amount, line_description) VALUES
('202401250000001', 1, 'D', '5012', NULL, NULL, 'DEPT003', 500000.00, '1月分給料'),
('202401250000001', 2, 'C', '1012', '1012-001', 'B001', NULL, 500000.00, 'みずほ銀行普通預金');

-- サンプル仕訳 5: 家賃支払
INSERT INTO journal_headers (journal_number, journal_date, description, total_amount, created_by)
VALUES ('202401310000001', '2024-01-31', '事務所家賃', 200000.00, NULL);

INSERT INTO journal_details (journal_number, line_number, debit_credit, account_code, sub_account_code, partner_code, analysis_code, amount, line_description) VALUES
('202401310000001', 1, 'D', '5013', NULL, 'O001', 'DEPT003', 200000.00, '1月分事務所家賃'),
('202401310000001', 2, 'C', '1012', '1012-001', 'B001', NULL, 200000.00, 'みずほ銀行普通預金');

-- ============================================================================
-- ユーザーロールのサンプルデータ（実際の運用では管理者が設定）
-- ============================================================================

-- 注意: 実際のユーザーUUIDは認証時に動的に設定される
-- このデータは開発・テスト用途のみ
INSERT INTO user_roles (user_id, user_role, department, company_code) VALUES
-- サンプルUUID（実際の運用では実在するauth.users.idを使用）
('00000000-0000-0000-0000-000000000001', 'admin', '管理部', 'COMP001'),
('00000000-0000-0000-0000-000000000002', 'manager', '営業部', 'COMP001'),
('00000000-0000-0000-0000-000000000003', 'user', '経理部', 'COMP001');

-- ============================================================================
-- 統計情報更新
-- ============================================================================

-- PostgreSQLの統計情報を更新（パフォーマンス向上のため）
ANALYZE accounts;
ANALYZE sub_accounts;
ANALYZE partners;
ANALYZE analysis_codes;
ANALYZE journal_headers;
ANALYZE journal_details;
ANALYZE user_roles;
