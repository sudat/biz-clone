// 基本型定義
export * from "./types";

// ヘルパー型と関数
export * from "./helpers";

// クエリビルダー
export { SupabaseQueryBuilder } from "./query-builder";

// サービス
export { 
  AccountService,
  SubAccountService,
  PartnerService,
  AnalysisCodeService
} from "./master";
export { JournalService } from "./journal";
export { AuthService } from "./auth";
export { JournalNumberService } from "./journal-number";

// 使用例のコメント
/*
使用例:

1. 基本的な型の使用:
import { Account, JournalHeader, CreateJournalSchema } from "@/lib/database";

2. ヘルパー型の使用:
import { AccountFilter, PaginatedResult, ApiResponse } from "@/lib/database";

3. クエリビルダーの使用:
import { SupabaseQueryBuilder } from "@/lib/database";

const accounts = await SupabaseQueryBuilder.getAccounts(
  { account_type: '資産', is_active: true },
  { page: 1, per_page: 20 }
);

4. 型ガードの使用:
import { isAccount, isJournalHeader } from "@/lib/database";

if (isAccount(data)) {
  // dataはAccount型として扱われる
  console.log(data.account_name);
}

5. サービスの使用:
import { AccountService, JournalService, AuthService } from "@/lib/database";

const accountsData = await AccountService.getAccounts();
const newJournal = await JournalService.createJournal(header, details);
const canCreateJournal = await AuthService.hasPermission('create', 'journal');
*/ 