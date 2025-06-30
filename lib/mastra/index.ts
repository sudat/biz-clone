import { Mastra } from "@mastra/core";
import { openai } from "@ai-sdk/openai";

export const mastra = new Mastra({
  // 基本設定 - 必要に応じて拡張可能
});

// OpenAI設定（環境変数からAPIキーを取得）
const openaiModel = openai("gpt-4o-mini", {
  apiKey: process.env.OPENAI_API_KEY,
});

export { openaiModel };