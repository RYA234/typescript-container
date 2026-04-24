# 内部設計書 - 自律リサーチエージェント

## 型定義

```typescript
// src/interfaces/agent-research.ts

export interface SearchEntry {
  query: string;
  rawResult: string;
  summary: string;
}

export type NextAction = "continue" | "done";

export interface NextDecision {
  action: NextAction;
  nextQuery: string;
  reason: string;
}

export interface ResearchRequest {
  message: string;
  maxIterations?: number;  // デフォルト 5
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ResearchResponse {
  reply: string;
  iterations: number;
  searchHistory: SearchEntry[];
}
```

## ツール定義（Function Calling）

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: "search_web",
        description: "指定クエリでウェブを検索し、結果テキストを返す（ダミーデータ）",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "検索クエリ" },
          },
          required: ["query"],
        },
      },
      {
        name: "summarize",
        description: "テキストを要約する",
        parameters: {
          type: "object",
          properties: {
            text: { type: "string", description: "要約対象テキスト" },
          },
          required: ["text"],
        },
      },
      {
        name: "decide_next",
        description: "現在の要約から追加調査が必要か判断する",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "現在の調査要約" },
            originalQuestion: { type: "string", description: "元の質問" },
          },
          required: ["summary", "originalQuestion"],
        },
      },
    ],
  },
];
```

## サービス実装詳細

### searchWeb（ダミーデータ）

```typescript
const SEARCH_DB: Record<string, string> = {
  "TypeScript 最新バージョン": "TypeScript 5.3 が 2024 年にリリース。Import Attributes サポート。",
  "TypeScript 5.3 新機能": "Import Attributes、switch(true) パターン対応、速度改善...",
  "TypeScript パフォーマンス": "5.x 系ではビルド速度が従来比 10〜15% 改善...",
};
// マッチしない場合は "検索結果なし" を返す
```

### ループ制御

```typescript
const MAX_ITERATIONS = maxIterations ?? 5;
let iteration = 0;
while (iteration < MAX_ITERATIONS) {
  // search → summarize → decide_next
  const decision = await decideNext(summary, originalQuestion);
  if (decision.action === "done") break;
  currentQuery = decision.nextQuery;
  iteration++;
}
```

### summarize

Gemini の summarize ノードを呼ぶのではなく、`tool_result` としてツールを経由させる。
実装は Gemini の `generateContent` にテキストを送って要約させる。

## テスト方針

| テスト種別 | 対象 | 確認事項 |
|-----------|------|---------|
| Unit | searchWeb | ヒット・ミス |
| Unit | ループ制御 | maxIterations で打ち切り |
| Unit | decideNext | continue/done の判断 |
| Integration | runResearch | 複数イテレーション実行 |
