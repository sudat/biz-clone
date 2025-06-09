-- 仕訳番号自動採番システム

-- 1. 仕訳番号管理テーブル
CREATE TABLE IF NOT EXISTS journal_number_sequences (
    journal_date DATE PRIMARY KEY,
    last_sequence_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLSポリシー設定
ALTER TABLE journal_number_sequences ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーは読み取り可能
CREATE POLICY "Users can view journal number sequences" ON journal_number_sequences
    FOR SELECT USING (auth.role() = 'authenticated');

-- 認証されたユーザーは更新可能（番号生成時）
CREATE POLICY "Users can update journal number sequences" ON journal_number_sequences
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 認証されたユーザーは新規作成可能
CREATE POLICY "Users can insert journal number sequences" ON journal_number_sequences
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_journal_number_sequences_date ON journal_number_sequences(journal_date);

-- 4. 更新時間を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_journal_number_sequences_updated_at 
    BEFORE UPDATE ON journal_number_sequences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 仕訳番号生成関数
CREATE OR REPLACE FUNCTION get_next_journal_number(target_date DATE)
RETURNS TEXT AS $$
DECLARE
    date_prefix TEXT;
    next_sequence INTEGER;
    journal_number TEXT;
BEGIN
    -- 日付をYYYYMMDD形式に変換
    date_prefix := to_char(target_date, 'YYYYMMDD');
    
    -- トランザクション内で安全に次の番号を取得
    -- UPSERT操作で該当日付のレコードを取得または作成し、シーケンス番号をインクリメント
    INSERT INTO journal_number_sequences (journal_date, last_sequence_number)
    VALUES (target_date, 1)
    ON CONFLICT (journal_date) DO UPDATE 
    SET 
        last_sequence_number = journal_number_sequences.last_sequence_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_sequence_number INTO next_sequence;
    
    -- 仕訳番号を生成（日付8桁 + 連番7桁ゼロパディング）
    journal_number := date_prefix || lpad(next_sequence::TEXT, 7, '0');
    
    RETURN journal_number;
EXCEPTION
    WHEN OTHERS THEN
        -- エラーが発生した場合はNULLを返す（呼び出し側でエラーハンドリング）
        RAISE EXCEPTION 'Failed to generate journal number for date %: %', target_date, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 仕訳番号存在チェック関数
CREATE OR REPLACE FUNCTION check_journal_number_exists(journal_number_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    exists_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO exists_count 
    FROM journal_headers 
    WHERE journal_number = journal_number_to_check;
    
    RETURN exists_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 特定日付の最後の仕訳番号を取得する関数
CREATE OR REPLACE FUNCTION get_last_journal_number_for_date(target_date DATE)
RETURNS TEXT AS $$
DECLARE
    date_prefix TEXT;
    last_sequence INTEGER;
    journal_number TEXT;
BEGIN
    date_prefix := to_char(target_date, 'YYYYMMDD');
    
    SELECT last_sequence_number INTO last_sequence
    FROM journal_number_sequences 
    WHERE journal_date = target_date;
    
    IF last_sequence IS NULL THEN
        RETURN NULL;
    END IF;
    
    journal_number := date_prefix || lpad(last_sequence::TEXT, 7, '0');
    RETURN journal_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. テスト用データ（開発時のみ）
-- INSERT INTO journal_number_sequences (journal_date, last_sequence_number) 
-- VALUES (CURRENT_DATE, 0); 