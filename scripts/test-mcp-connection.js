/**
 * MCP Connection Test Script
 * ============================================================================
 * MCPエンドポイントの動作確認用スクリプト
 *
 * 使用方法:
 * node scripts/test-mcp-connection.js
 * ============================================================================
 */

const https = require("https");

const BASE_URL = "https://biz-clone.vercel.app";
// const BASE_URL = 'http://localhost:3000'; // ローカルテスト用

// 色付きログ出力用
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTPリクエストを送信する関数
function makeRequest(path, options = {}) {
  const url = new URL(path, BASE_URL);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );

    req.on("error", reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// テスト実行
async function runTests() {
  log("\n=== MCP Connection Test ===\n", "bright");

  try {
    // 1. GETリクエストテスト（デバッグ情報）
    log("1. Testing GET /api...", "cyan");
    const getResponse = await makeRequest("/api", { method: "GET" });
    log(
      `   Status: ${getResponse.status}`,
      getResponse.status === 200 ? "green" : "red"
    );
    log(`   Response: ${getResponse.body}`, "yellow");

    // 2. OPTIONSリクエストテスト（CORS）
    log("\n2. Testing OPTIONS /api...", "cyan");
    const optionsResponse = await makeRequest("/api", { method: "OPTIONS" });
    log(
      `   Status: ${optionsResponse.status}`,
      optionsResponse.status === 200 ? "green" : "red"
    );
    log(`   CORS Headers:`, "yellow");
    Object.entries(optionsResponse.headers).forEach(([key, value]) => {
      if (key.toLowerCase().includes("access-control")) {
        log(`     ${key}: ${value}`, "yellow");
      }
    });

    // 3. Initialize メソッドテスト
    log("\n3. Testing initialize method...", "cyan");
    const initResponse = await makeRequest("/api", {
      method: "POST",
      body: {
        jsonrpc: "2.0",
        method: "initialize",
        params: {},
        id: 1,
      },
    });
    log(
      `   Status: ${initResponse.status}`,
      initResponse.status === 200 ? "green" : "red"
    );
    log(`   Response: ${initResponse.body}`, "yellow");

    // 4. List Tools メソッドテスト
    log("\n4. Testing list_tools method...", "cyan");
    const listToolsResponse = await makeRequest("/api", {
      method: "POST",
      body: {
        jsonrpc: "2.0",
        method: "list_tools",
        params: {},
        id: 2,
      },
    });
    log(
      `   Status: ${listToolsResponse.status}`,
      listToolsResponse.status === 200 ? "green" : "red"
    );
    log(`   Response: ${listToolsResponse.body}`, "yellow");

    // 5. 無効なJSON-RPCリクエストテスト
    log("\n5. Testing invalid JSON-RPC request...", "cyan");
    const invalidResponse = await makeRequest("/api", {
      method: "POST",
      body: {
        method: "test", // jsonrpc フィールドがない
        id: 3,
      },
    });
    log(
      `   Status: ${invalidResponse.status}`,
      invalidResponse.status === 400 ? "green" : "red"
    );
    log(`   Response: ${invalidResponse.body}`, "yellow");

    // 6. SSEエンドポイントテスト
    log("\n6. Testing SSE endpoint...", "cyan");
    const sseResponse = await makeRequest("/api/sse", { method: "GET" });
    log(
      `   Status: ${sseResponse.status}`,
      sseResponse.status === 200 ? "green" : "red"
    );
    log(`   Content-Type: ${sseResponse.headers["content-type"]}`, "yellow");

    log("\n=== Test Complete ===\n", "bright");
  } catch (error) {
    log(`\nError: ${error.message}`, "red");
    console.error(error);
  }
}

// テスト実行
runTests();
