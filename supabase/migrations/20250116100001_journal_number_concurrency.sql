-- 仕訳番号自動採番システム - 並行処理・重複防止強化

-- 1. 並行処理対応の仕訳番号生成関数（改良版）
CREATE OR REPLACE FUNCTION get_next_journal_number_safe(target_date DATE, max_retries INTEGER DEFAULT 3)
RETURNS TEXT AS $$
DECLARE
    date_prefix TEXT;
    next_sequence INTEGER;
    journal_number TEXT;
    retry_count INTEGER := 0;
    current_sequence INTEGER;
BEGIN
    -- 日付をYYYYMMDD形式に変換
    date_prefix := to_char(target_date, 'YYYYMMDD');
    
    -- リトライループ
    WHILE retry_count < max_retries LOOP
        BEGIN
            -- 明示的ロックを使用して行を取得または作成
            SELECT last_sequence_number INTO current_sequence
            FROM journal_number_sequences 
            WHERE journal_date = target_date 
            FOR UPDATE;
            
            IF current_sequence IS NULL THEN
                -- レコードが存在しない場合は新規作成
                INSERT INTO journal_number_sequences (journal_date, last_sequence_number)
                VALUES (target_date, 1);
                next_sequence := 1;
            ELSE
                -- 既存レコードを更新
                next_sequence := current_sequence + 1;
                UPDATE journal_number_sequences 
                SET 
                    last_sequence_number = next_sequence,
                    updated_at = timezone('utc'::text, now())
                WHERE journal_date = target_date;
            END IF;
            
            -- 成功時はループを抜ける
            EXIT;
            
        EXCEPTION
            WHEN OTHERS THEN
                retry_count := retry_count + 1;
                
                -- 最大リトライ数に達した場合はエラー
                IF retry_count >= max_retries THEN
                    RAISE EXCEPTION 'Failed to generate journal number after % retries for date %: %', 
                        max_retries, target_date, SQLERRM;
                END IF;
                
                -- 短時間待機してリトライ（デッドロック回避）
                PERFORM pg_sleep(0.1 * retry_count);
        END;
    END LOOP;
    
    -- 仕訳番号を生成（日付8桁 + 連番7桁ゼロパディング）
    journal_number := date_prefix || lpad(next_sequence::TEXT, 7, '0');
    
    RETURN journal_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. バッチ処理用の複数仕訳番号生成関数
CREATE OR REPLACE FUNCTION get_multiple_journal_numbers(target_date DATE, count INTEGER)
RETURNS TEXT[] AS $$
DECLARE
    date_prefix TEXT;
    start_sequence INTEGER;
    journal_numbers TEXT[];
    i INTEGER;
BEGIN
    -- 日付をYYYYMMDD形式に変換
    date_prefix := to_char(target_date, 'YYYYMMDD');
    
    -- 一括で必要な数だけシーケンス番号を確保
    INSERT INTO journal_number_sequences (journal_date, last_sequence_number)
    VALUES (target_date, count)
    ON CONFLICT (journal_date) DO UPDATE 
    SET 
        last_sequence_number = journal_number_sequences.last_sequence_number + count,
        updated_at = timezone('utc'::text, now())
    RETURNING (last_sequence_number - count + 1) INTO start_sequence;
    
    -- 仕訳番号配列を生成
    journal_numbers := ARRAY[]::TEXT[];
    FOR i IN start_sequence..(start_sequence + count - 1) LOOP
        journal_numbers := array_append(journal_numbers, date_prefix || lpad(i::TEXT, 7, '0'));
    END LOOP;
    
    RETURN journal_numbers;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to generate % journal numbers for date %: %', 
            count, target_date, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 仕訳番号の整合性チェック関数
CREATE OR REPLACE FUNCTION validate_journal_number_integrity(target_date DATE DEFAULT NULL)
RETURNS TABLE(
    date_checked DATE,
    expected_count INTEGER,
    actual_count INTEGER,
    missing_numbers TEXT[],
    duplicate_numbers TEXT[]
) AS $$
DECLARE
    check_date DATE;
    date_prefix TEXT;
    max_sequence INTEGER;
    actual_journal_count INTEGER;
    missing_list TEXT[];
    duplicate_list TEXT[];
    i INTEGER;
    journal_num TEXT;
    journal_count INTEGER;
BEGIN
    -- 対象日付が指定されていない場合は、journal_number_sequencesの全日付をチェック
    FOR check_date IN 
        SELECT COALESCE(target_date, jns.journal_date) 
        FROM (
            SELECT DISTINCT journal_date FROM journal_number_sequences
            WHERE target_date IS NULL OR journal_date = target_date
        ) jns
    LOOP
        -- 日付プレフィックス
        date_prefix := to_char(check_date, 'YYYYMMDD');
        
        -- 期待される最大シーケンス番号
        SELECT last_sequence_number INTO max_sequence
        FROM journal_number_sequences 
        WHERE journal_date = check_date;
        
        -- 実際の仕訳データ数
        SELECT COUNT(*) INTO actual_journal_count
        FROM journal_headers 
        WHERE journal_date = check_date::TEXT;
        
        -- 欠番チェック
        missing_list := ARRAY[]::TEXT[];
        FOR i IN 1..COALESCE(max_sequence, 0) LOOP
            journal_num := date_prefix || lpad(i::TEXT, 7, '0');
            
            SELECT COUNT(*) INTO journal_count
            FROM journal_headers 
            WHERE journal_number = journal_num;
            
            IF journal_count = 0 THEN
                missing_list := array_append(missing_list, journal_num);
            END IF;
        END LOOP;
        
        -- 重複チェック
        SELECT array_agg(journal_number) INTO duplicate_list
        FROM (
            SELECT journal_number
            FROM journal_headers 
            WHERE journal_date = check_date::TEXT
            GROUP BY journal_number 
            HAVING COUNT(*) > 1
        ) duplicates;
        
        -- 結果を返す
        date_checked := check_date;
        expected_count := COALESCE(max_sequence, 0);
        actual_count := actual_journal_count;
        missing_numbers := COALESCE(missing_list, ARRAY[]::TEXT[]);
        duplicate_numbers := COALESCE(duplicate_list, ARRAY[]::TEXT[]);
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 古い関数のエイリアス（後方互換性）
CREATE OR REPLACE FUNCTION get_next_journal_number(target_date DATE)
RETURNS TEXT AS $$
BEGIN
    RETURN get_next_journal_number_safe(target_date, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 