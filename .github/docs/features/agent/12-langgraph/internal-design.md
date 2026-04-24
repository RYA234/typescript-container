# 内部設計書 - LangGraphエージェント

## 型定義

```typescript
// src/interfaces/agent-langgraph.ts

export type MessageType = "search" | "calculate" | "answer";

export interface GraphState {
  messages: string[];
  messageType?: MessageType;
  searchResult?: string;
  calcResult?: string;
  finalAnswer?: string;
}

export interface LangGraphRequest {
  message: string;
}

export interface GraphResponse {
  reply: string;
  graphPath: string[];
  state: Partial<GraphState>;
}
```

## グラフ構築（LangGraph.js）

```typescript
import { StateGraph, END, START } from "@langchain/langgraph";

function buildGraph(): CompiledGraph {
  const graph = new StateGraph<GraphState>({
    channels: {
      messages:     { value: (a, b) => [...a, ...b], default: () => [] },
      messageType:  { value: (_, b) => b },
      searchResult: { value: (_, b) => b },
      calcResult:   { value: (_, b) => b },
      finalAnswer:  { value: (_, b) => b },
    },
  });

  graph.addNode("classify", classifyNode);
  graph.addNode("search",   searchNode);
  graph.addNode("calculate", calcNode);
  graph.addNode("answer",   answerNode);

  graph.addEdge(START, "classify");
  graph.addConditionalEdges("classify", routeByType, {
    search:    "search",
    calculate: "calculate",
    answer:    "answer",
  });
  graph.addEdge("search",    "answer");
  graph.addEdge("calculate", "answer");
  graph.addEdge("answer",    END);

  return graph.compile();
}
```

## 各ノードの実装詳細

### classifyNode

Gemini に「このメッセージは検索が必要か、計算が必要か、直接回答できるか？」を問い合わせ。
返答から `messageType` を設定。

### searchNode

ダミー検索 Map またはキーワードマッチで `searchResult` を設定:
```typescript
const SEARCH_DB: Record<string, string> = {
  "東京": "東京都人口: 約 1,400 万人",
  "大阪": "大阪府人口: 約 880 万人",
  // ...
};
```

### calcNode

入力メッセージから算術式を抽出して計算し `calcResult` を設定。

### answerNode

classify → search/calculate → answer のコンテキストを元に Gemini で最終回答生成。

## テスト方針

| テスト種別 | 対象 | 確認事項 |
|-----------|------|---------|
| Unit | classifyNode | search/calculate/answer の分岐 |
| Unit | searchNode | キーワードマッチ |
| Unit | routeByType | 全 3 パターン |
| Integration | runGraph | フルグラフ実行 + graphPath |
