-- CreateTable
CREATE TABLE "accounts" (
    "account_code" VARCHAR(10) NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "account_type" VARCHAR(20) NOT NULL,
    "parent_account_code" VARCHAR(10),
    "is_detail" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_code")
);

-- CreateTable
CREATE TABLE "sub_accounts" (
    "sub_account_code" VARCHAR(15) NOT NULL,
    "account_code" VARCHAR(10) NOT NULL,
    "sub_account_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_accounts_pkey" PRIMARY KEY ("account_code","sub_account_code")
);

-- CreateTable
CREATE TABLE "partners" (
    "partner_code" VARCHAR(15) NOT NULL,
    "partner_name" VARCHAR(100) NOT NULL,
    "partner_kana" VARCHAR(100),
    "partner_type" VARCHAR(20) NOT NULL,
    "postal_code" VARCHAR(8),
    "address" VARCHAR(200),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "contact_person" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("partner_code")
);

-- CreateTable
CREATE TABLE "analysis_codes" (
    "analysis_code" VARCHAR(15) NOT NULL,
    "analysis_name" VARCHAR(100) NOT NULL,
    "analysis_type" VARCHAR(20) NOT NULL,
    "parent_analysis_code" VARCHAR(15),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_codes_pkey" PRIMARY KEY ("analysis_code")
);

-- CreateTable
CREATE TABLE "journal_headers" (
    "journal_number" VARCHAR(15) NOT NULL,
    "journal_date" DATE NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "journal_headers_pkey" PRIMARY KEY ("journal_number")
);

-- CreateTable
CREATE TABLE "journal_details" (
    "journal_number" VARCHAR(15) NOT NULL,
    "line_number" INTEGER NOT NULL,
    "debit_credit" VARCHAR(1) NOT NULL,
    "account_code" VARCHAR(10) NOT NULL,
    "sub_account_code" VARCHAR(15),
    "partner_code" VARCHAR(15),
    "analysis_code" VARCHAR(15),
    "amount" DECIMAL(15,2) NOT NULL,
    "line_description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_details_pkey" PRIMARY KEY ("journal_number","line_number")
);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_code_fkey" FOREIGN KEY ("parent_account_code") REFERENCES "accounts"("account_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_accounts" ADD CONSTRAINT "sub_accounts_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "accounts"("account_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_codes" ADD CONSTRAINT "analysis_codes_parent_analysis_code_fkey" FOREIGN KEY ("parent_analysis_code") REFERENCES "analysis_codes"("analysis_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_details" ADD CONSTRAINT "journal_details_journal_number_fkey" FOREIGN KEY ("journal_number") REFERENCES "journal_headers"("journal_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_details" ADD CONSTRAINT "journal_details_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "accounts"("account_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_details" ADD CONSTRAINT "journal_details_account_code_sub_account_code_fkey" FOREIGN KEY ("account_code", "sub_account_code") REFERENCES "sub_accounts"("account_code", "sub_account_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_details" ADD CONSTRAINT "journal_details_partner_code_fkey" FOREIGN KEY ("partner_code") REFERENCES "partners"("partner_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_details" ADD CONSTRAINT "journal_details_analysis_code_fkey" FOREIGN KEY ("analysis_code") REFERENCES "analysis_codes"("analysis_code") ON DELETE SET NULL ON UPDATE CASCADE;
