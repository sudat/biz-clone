/**
 * 型変換ユーティリティのテスト
 * lib/utils/typeConverters.ts
 */

import {
  camelToSnake,
  convertArrayKeys,
  convertOptional,
  snakeToCamel,
} from "../../lib/utils/typeConverters";

describe("typeConverters", () => {
  describe("snakeToCamel", () => {
    test("should convert snake_case keys to camelCase", () => {
      const input = {
        account_code: "1001",
        account_name: "現金",
        is_active: true,
      };

      const expected = {
        accountCode: "1001",
        accountName: "現金",
        isActive: true,
      };

      expect(snakeToCamel(input)).toEqual(expected);
    });

    test("should handle nested objects", () => {
      const input = {
        account_info: {
          account_code: "1001",
          parent_account: {
            parent_code: "1000",
            parent_name: "流動資産",
          },
        },
        created_at: "2024-01-01T00:00:00Z",
      };

      const expected = {
        accountInfo: {
          accountCode: "1001",
          parentAccount: {
            parentCode: "1000",
            parentName: "流動資産",
          },
        },
        createdAt: "2024-01-01T00:00:00Z",
      };

      expect(snakeToCamel(input)).toEqual(expected);
    });

    test("should handle arrays", () => {
      const input = {
        sub_accounts: [
          { sub_account_code: "1001-01", sub_account_name: "現金手許有高" },
          { sub_account_code: "1001-02", sub_account_name: "現金預金" },
        ],
      };

      const expected = {
        subAccounts: [
          { subAccountCode: "1001-01", subAccountName: "現金手許有高" },
          { subAccountCode: "1001-02", subAccountName: "現金預金" },
        ],
      };

      expect(snakeToCamel(input)).toEqual(expected);
    });

    test("should handle primitive values", () => {
      expect(snakeToCamel("test")).toBe("test");
      expect(snakeToCamel(123)).toBe(123);
      expect(snakeToCamel(true)).toBe(true);
    });

    test("should handle null and undefined", () => {
      expect(snakeToCamel(null)).toBeNull();
      expect(snakeToCamel(undefined)).toBeUndefined();
    });

    test("should handle Date objects", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      expect(snakeToCamel(date)).toBe(date);
    });

    test("should handle empty objects and arrays", () => {
      expect(snakeToCamel({})).toEqual({});
      expect(snakeToCamel([])).toEqual([]);
    });

    test("should handle complex nested structure", () => {
      const input = {
        journal_entries: [
          {
            entry_id: 1,
            entry_date: "2024-01-01",
            line_items: [
              {
                account_code: "1001",
                debit_amount: 1000,
                credit_amount: 0,
                analysis_codes: {
                  department_code: "SALES",
                  project_code: "PRJ001",
                },
              },
            ],
          },
        ],
      };

      const expected = {
        journalEntries: [
          {
            entryId: 1,
            entryDate: "2024-01-01",
            lineItems: [
              {
                accountCode: "1001",
                debitAmount: 1000,
                creditAmount: 0,
                analysisCodes: {
                  departmentCode: "SALES",
                  projectCode: "PRJ001",
                },
              },
            ],
          },
        ],
      };

      expect(snakeToCamel(input)).toEqual(expected);
    });
  });

  describe("camelToSnake", () => {
    test("should convert camelCase keys to snake_case", () => {
      const input = {
        accountCode: "1001",
        accountName: "現金",
        isActive: true,
      };

      const expected = {
        account_code: "1001",
        account_name: "現金",
        is_active: true,
      };

      expect(camelToSnake(input)).toEqual(expected);
    });

    test("should handle nested objects", () => {
      const input = {
        accountInfo: {
          accountCode: "1001",
          parentAccount: {
            parentCode: "1000",
            parentName: "流動資産",
          },
        },
        createdAt: "2024-01-01T00:00:00Z",
      };

      const expected = {
        account_info: {
          account_code: "1001",
          parent_account: {
            parent_code: "1000",
            parent_name: "流動資産",
          },
        },
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(camelToSnake(input)).toEqual(expected);
    });

    test("should handle arrays", () => {
      const input = {
        subAccounts: [
          { subAccountCode: "1001-01", subAccountName: "現金手許有高" },
          { subAccountCode: "1001-02", subAccountName: "現金預金" },
        ],
      };

      const expected = {
        sub_accounts: [
          { sub_account_code: "1001-01", sub_account_name: "現金手許有高" },
          { sub_account_code: "1001-02", sub_account_name: "現金預金" },
        ],
      };

      expect(camelToSnake(input)).toEqual(expected);
    });

    test("should convert Date objects to ISO strings", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const input = { createdAt: date };
      const expected = { created_at: "2024-01-01T00:00:00.000Z" };

      expect(camelToSnake(input)).toEqual(expected);
    });

    test("should handle primitive values", () => {
      expect(camelToSnake("test")).toBe("test");
      expect(camelToSnake(123)).toBe(123);
      expect(camelToSnake(true)).toBe(true);
    });

    test("should handle null and undefined", () => {
      expect(camelToSnake(null)).toBeNull();
      expect(camelToSnake(undefined)).toBeUndefined();
    });
  });

  describe("round-trip conversion", () => {
    test("should maintain data integrity through round-trip conversion", () => {
      const originalSnake = {
        account_code: "1001",
        account_name: "現金",
        sub_accounts: [
          {
            sub_account_code: "1001-01",
            sub_account_name: "現金手許有高",
            is_active: true,
            sort_order: 1,
          },
        ],
        created_at: "2024-01-01T00:00:00Z",
      };

      // snake → camel → snake
      const camelConverted = snakeToCamel(originalSnake);
      const backToSnake = camelToSnake(camelConverted);

      expect(backToSnake).toEqual(originalSnake);
    });

    test("should handle complex data structures", () => {
      const complexData = {
        journal_entry: {
          entry_id: 1,
          entry_date: "2024-01-01",
          line_items: [
            {
              line_id: 1,
              account_code: "1001",
              debit_amount: 1000,
              credit_amount: 0,
              analysis_codes: [
                { code_type: "DEPT", code_value: "SALES" },
                { code_type: "PROJ", code_value: "PRJ001" },
              ],
            },
          ],
          total_amount: 1000,
          is_balanced: true,
        },
      };

      const camelConverted = snakeToCamel(complexData);
      const backToSnake = camelToSnake(camelConverted);

      expect(backToSnake).toEqual(complexData);
    });
  });

  describe("convertArrayKeys", () => {
    test("should convert array of objects using provided converter", () => {
      const input = [
        { account_code: "1001", account_name: "現金" },
        { account_code: "2001", account_name: "買掛金" },
      ];

      const result = convertArrayKeys(input, snakeToCamel);

      expect(result).toEqual([
        { accountCode: "1001", accountName: "現金" },
        { accountCode: "2001", accountName: "買掛金" },
      ]);
    });

    test("should handle empty arrays", () => {
      const result = convertArrayKeys([], snakeToCamel);
      expect(result).toEqual([]);
    });
  });

  describe("convertOptional", () => {
    test("should convert non-null values", () => {
      const input = { account_code: "1001", account_name: "現金" };
      const result = convertOptional(input, snakeToCamel);

      expect(result).toEqual({ accountCode: "1001", accountName: "現金" });
    });

    test("should return null for null input", () => {
      const result = convertOptional(null, snakeToCamel);
      expect(result).toBeNull();
    });

    test("should return undefined for undefined input", () => {
      const result = convertOptional(undefined, snakeToCamel);
      expect(result).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    test("should handle mixed case keys", () => {
      const input = {
        normalKey: "value1",
        snake_case_key: "value2",
        camelCaseKey: "value3",
        UPPER_CASE: "value4",
      };

      const snakeResult = camelToSnake(input);
      expect(snakeResult).toEqual({
        normal_key: "value1",
        snake_case_key: "value2",
        camel_case_key: "value3",
        u_p_p_e_r__c_a_s_e: "value4",
      });
    });

    test("should handle keys with numbers", () => {
      const input = {
        account1Code: "value1",
        account2Name: "value2",
      };

      const result = camelToSnake(input);
      expect(result).toEqual({
        account1_code: "value1",
        account2_name: "value2",
      });
    });

    test("should handle deep nesting", () => {
      const input = {
        level1: {
          level2: {
            level3: {
              level4: {
                deep_value: "test",
              },
            },
          },
        },
      };

      const camelResult = snakeToCamel(input);
      expect(camelResult.level1.level2.level3.level4.deepValue).toBe("test");

      const snakeResult = camelToSnake(camelResult);
      expect(snakeResult).toEqual(input);
    });
  });
});
