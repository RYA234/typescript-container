# 内部設計書 - 天気・計算・時刻エージェント

## 型定義

```typescript
// src/interfaces/agent-basic.ts

export interface AgentRequest {
  message: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface AgentResponse {
  reply: string;
  toolCalls: ToolCall[];
}

export type ToolName = "get_weather" | "calculate" | "get_current_time";
```

## ツール定義（Function Calling）

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: "get_weather",
        description: "指定した都市の現在の天気と気温を返す",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string", description: "都市名（例: 東京）" },
          },
          required: ["city"],
        },
      },
      {
        name: "calculate",
        description: "四則演算を計算する",
        parameters: {
          type: "object",
          properties: {
            expression: { type: "string", description: "計算式（例: 3 + 5 * 2）" },
          },
          required: ["expression"],
        },
      },
      {
        name: "get_current_time",
        description: "現在の日時を返す",
        parameters: { type: "object", properties: {} },
      },
    ],
  },
];
```

## サービス実装詳細

### BasicAgentService

- `runAgent(message)`: Gemini に初回リクエスト → Function Call が返ったらツール実行 → 結果を Gemini に渡して最終応答取得
- `callTool(name, args)`:
  - `get_weather`: ダミーデータ Map から都市名で検索し「晴れ, 22°C」形式で返す
  - `calculate`: `eval()` の代わりに `Function("return " + expr)()` で安全に評価
  - `get_current_time`: `new Date().toISOString()`

### ツールループ

```
while (response.functionCall) {
  result = callTool(functionCall.name, functionCall.args)
  response = gemini.generateContent([...history, { role: "tool", result }])
}
```

最大ループ回数: 10（無限ループ防止）

## テスト方針

| テスト種別 | 対象 | モック対象 |
|-----------|------|-----------|
| Unit | BasicAgentService.callTool | なし（純粋関数） |
| Unit | BasicAgentService.runAgent | GeminiClient |
| Unit | BasicAgentController.chat | BasicAgentService |
| Integration | POST /node/agent/basic/chat | GeminiClient |

### テストファイル配置

```
src/agent-basic/tests/
├── service.test.ts
└── controller.test.ts
```
