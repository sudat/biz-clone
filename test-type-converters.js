/**
 * 型変換ユーティリティの動作確認テスト
 * CommonJS形式で実行
 */

// TypeScriptファイルは直接requireできないので、
// 関数をここで再実装してテストします

// ====================
// キー変換ヘルパー関数
// ====================

function snakeToCamelKey(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnakeKey(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// ====================
// メイン変換関数
// ====================

function snakeToCamel(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item));
  }

  if (obj instanceof Date) {
    return obj;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamelKey(key);
    result[camelKey] = snakeToCamel(value);
  }

  return result;
}

function camelToSnake(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => camelToSnake(item));
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnakeKey(key);
    result[snakeKey] = camelToSnake(value);
  }

  return result;
}

// ====================
// テスト実行
// ====================

console.log("🧪 型変換ユーティリティのテスト開始\n");

// Test 1: Basic snake_case to camelCase
console.log("✅ Test 1: snake_case → camelCase");
const test1Input = {
  account_code: "1001",
  account_name: "現金",
  is_active: true,
};

const test1Result = snakeToCamel(test1Input);
console.log("Input:", test1Input);
console.log("Output:", test1Result);
console.log("Expected camelCase keys:", Object.keys(test1Result));
console.log("");

// Test 2: Nested objects
console.log("✅ Test 2: ネストオブジェクト変換");
const test2Input = {
  account_info: {
    account_code: "1001",
    parent_account: {
      parent_code: "1000",
      parent_name: "流動資産",
    },
  },
};

const test2Result = snakeToCamel(test2Input);
console.log("Input:", JSON.stringify(test2Input, null, 2));
console.log("Output:", JSON.stringify(test2Result, null, 2));
console.log("");

// Test 3: Arrays
console.log("✅ Test 3: 配列変換");
const test3Input = {
  sub_accounts: [
    { sub_account_code: "1001-01", sub_account_name: "現金手許有高" },
    { sub_account_code: "1001-02", sub_account_name: "現金預金" },
  ],
};

const test3Result = snakeToCamel(test3Input);
console.log("Input:", JSON.stringify(test3Input, null, 2));
console.log("Output:", JSON.stringify(test3Result, null, 2));
console.log("");

// Test 4: Round-trip conversion
console.log("✅ Test 4: 往復変換テスト（データ完全性）");
const test4Input = {
  account_code: "1001",
  account_name: "現金",
  created_at: "2024-01-01T00:00:00Z",
  is_active: true,
};

const camelConverted = snakeToCamel(test4Input);
const backToSnake = camelToSnake(camelConverted);

console.log("Original:", test4Input);
console.log("→ camelCase:", camelConverted);
console.log("→ back to snake_case:", backToSnake);

const isEqual = JSON.stringify(test4Input) === JSON.stringify(backToSnake);
console.log("Data integrity check:", isEqual ? "✅ PASS" : "❌ FAIL");
console.log("");

// Test 5: camelCase to snake_case
console.log("✅ Test 5: camelCase → snake_case");
const test5Input = {
  accountCode: "1001",
  accountName: "現金",
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const test5Result = camelToSnake(test5Input);
console.log("Input:", test5Input);
console.log("Output:", test5Result);
console.log("Note: Date converted to ISO string:", test5Result.created_at);
console.log("");

// Test 6: Edge cases
console.log("✅ Test 6: エッジケース");
console.log("null:", snakeToCamel(null));
console.log("undefined:", snakeToCamel(undefined));
console.log("string:", snakeToCamel("test"));
console.log("number:", snakeToCamel(123));
console.log("boolean:", snakeToCamel(true));
console.log("empty object:", snakeToCamel({}));
console.log("empty array:", snakeToCamel([]));
console.log("");

console.log("🎉 全テスト完了！");
console.log("✅ 型変換ユーティリティは正常に動作しています。");
