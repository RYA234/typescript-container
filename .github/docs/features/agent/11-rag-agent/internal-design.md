# 内部設計書 - RAG + エージェント連携

## 型定義

```typescript
// src/interfaces/agent-rag.ts

export interface SearchResult {
  content: string;
  score: number;
  source: string;
}

export interface RagAgentRequest {
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
```

## ツール定義（Function Calling）

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: "search_documents",
        description: "社内ドキュメントを RAG 検索する。プロジェクト情報・ポリシー・仕様書などを検索できる",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "検索クエリ" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_current_date",
        description: "現在の日付と時刻を返す",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "calculate",
        description: "算術式を計算する",
        parameters: {
          type: "object",
          properties: {
            expression: { type: "string", description: "算術式（例: 5000000 - 2300000）" },
          },
          required: ["expression"],
        },
      },
    ],
  },
];
```

## サービス実装詳細

### searchDocuments

```typescript
async searchDocuments(query: string): Promise<string> {
  const results = await this.ragService.search(query);
  if (results.length === 0) return "関連ドキュメントが見つかりませんでした";
  return results
    .slice(0, 3)
    .map((r, i) => `[${i + 1}] ${r.content} (出典: ${r.source})`)
    .join("\n");
}
```

### RAG サービス依存関係

- `src/rag/service.ts` の `RagService` クラスを DI で注入
- Supabase 未設定の場合はインメモリのサンプルドキュメントにフォールバック

### サンプルドキュメント（インメモリフォールバック）

```typescript
const SAMPLE_DOCS = [
  { content: "プロジェクト X の総予算は 5,000,000 円。2025 年度計画。", source: "project-x.txt" },
  { content: "プロジェクト X 使用済み予算: 2,300,000 円（2025-01 時点）", source: "budget-report.txt" },
  { content: "有給休暇ポリシー: 入社後 6 ヶ月で 10 日付与", source: "hr-policy.txt" },
];
```

## テスト方針

| テスト種別 | 対象 | 確認事項 |
|-----------|------|---------|
| Unit | searchDocuments | 結果あり・なし・フォールバック |
| Unit | calculate | 正常・ゼロ除算 |
| Unit | runAgent | RagService モック + Gemini モック |
| Integration | POST /chat | RAG 検索 → 計算フロー |
