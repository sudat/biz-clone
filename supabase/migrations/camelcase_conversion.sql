-- ============================================================================
-- Complete camelCase Conversion for All Tables
-- ============================================================================
-- This migration converts all column names from snake_case to camelCase
-- for consistency with frontend TypeScript conventions

-- Accounts table
ALTER TABLE accounts RENAME COLUMN account_code TO "accountCode";
ALTER TABLE accounts RENAME COLUMN account_name TO "accountName";
ALTER TABLE accounts RENAME COLUMN account_type TO "accountType";
ALTER TABLE accounts RENAME COLUMN parent_account_code TO "parentAccountCode";
ALTER TABLE accounts RENAME COLUMN is_detail TO "isDetail";
ALTER TABLE accounts RENAME COLUMN is_active TO "isActive";
ALTER TABLE accounts RENAME COLUMN sort_order TO "sortOrder";
ALTER TABLE accounts RENAME COLUMN created_at TO "createdAt";
ALTER TABLE accounts RENAME COLUMN updated_at TO "updatedAt";

-- Sub-accounts table
ALTER TABLE sub_accounts RENAME COLUMN sub_account_code TO "subAccountCode";
ALTER TABLE sub_accounts RENAME COLUMN account_code TO "accountCode";
ALTER TABLE sub_accounts RENAME COLUMN sub_account_name TO "subAccountName";
ALTER TABLE sub_accounts RENAME COLUMN is_active TO "isActive";
ALTER TABLE sub_accounts RENAME COLUMN sort_order TO "sortOrder";
ALTER TABLE sub_accounts RENAME COLUMN created_at TO "createdAt";
ALTER TABLE sub_accounts RENAME COLUMN updated_at TO "updatedAt";

-- Partners table
ALTER TABLE partners RENAME COLUMN partner_code TO "partnerCode";
ALTER TABLE partners RENAME COLUMN partner_name TO "partnerName";
ALTER TABLE partners RENAME COLUMN partner_kana TO "partnerKana";
ALTER TABLE partners RENAME COLUMN partner_type TO "partnerType";
ALTER TABLE partners RENAME COLUMN postal_code TO "postalCode";
ALTER TABLE partners RENAME COLUMN contact_person TO "contactPerson";
ALTER TABLE partners RENAME COLUMN is_active TO "isActive";
ALTER TABLE partners RENAME COLUMN created_at TO "createdAt";
ALTER TABLE partners RENAME COLUMN updated_at TO "updatedAt";

-- Analysis codes table
ALTER TABLE analysis_codes RENAME COLUMN analysis_code TO "analysisCode";
ALTER TABLE analysis_codes RENAME COLUMN analysis_name TO "analysisName";
ALTER TABLE analysis_codes RENAME COLUMN analysis_type TO "analysisType";
ALTER TABLE analysis_codes RENAME COLUMN parent_analysis_code TO "parentAnalysisCode";
ALTER TABLE analysis_codes RENAME COLUMN is_active TO "isActive";
ALTER TABLE analysis_codes RENAME COLUMN sort_order TO "sortOrder";
ALTER TABLE analysis_codes RENAME COLUMN created_at TO "createdAt";
ALTER TABLE analysis_codes RENAME COLUMN updated_at TO "updatedAt";

-- Journal headers table
ALTER TABLE journal_headers RENAME COLUMN journal_number TO "journalNumber";
ALTER TABLE journal_headers RENAME COLUMN journal_date TO "journalDate";
ALTER TABLE journal_headers RENAME COLUMN total_amount TO "totalAmount";
ALTER TABLE journal_headers RENAME COLUMN created_at TO "createdAt";
ALTER TABLE journal_headers RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE journal_headers RENAME COLUMN created_by TO "createdBy";

-- Journal details table
ALTER TABLE journal_details RENAME COLUMN journal_number TO "journalNumber";
ALTER TABLE journal_details RENAME COLUMN line_number TO "lineNumber";
ALTER TABLE journal_details RENAME COLUMN debit_credit TO "debitCredit";
ALTER TABLE journal_details RENAME COLUMN account_code TO "accountCode";
ALTER TABLE journal_details RENAME COLUMN sub_account_code TO "subAccountCode";
ALTER TABLE journal_details RENAME COLUMN partner_code TO "partnerCode";
ALTER TABLE journal_details RENAME COLUMN analysis_code TO "analysisCode";
ALTER TABLE journal_details RENAME COLUMN line_description TO "lineDescription";
ALTER TABLE journal_details RENAME COLUMN created_at TO "createdAt";
ALTER TABLE journal_details RENAME COLUMN updated_at TO "updatedAt";

-- Update foreign key constraints to use new column names
-- (PostgreSQL will automatically update foreign key references when column names change)

-- Update any indexes that might reference old column names
-- (PostgreSQL automatically updates index definitions when column names change)

COMMENT ON SCHEMA public IS 'Complete camelCase conversion completed for all accounting tables';