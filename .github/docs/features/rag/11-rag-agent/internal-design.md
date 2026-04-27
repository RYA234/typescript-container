# RAG #11 RAG + エージェント連携 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#63](https://github.com/RYA234/typescript-container/issues/63)
- **ソース**: `src/rag/rag-agent/`

---

## 環境制約（本番ガード）

`router.ts` で `NODE_ENV === 'production'` の場合、書き込み系エンドポイントを登録しない。

```typescript
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  router.post('/ingest', controller.ingest);
  router.delete('/documents', controller.deleteAll); // 実装する場合
}
// 検索系は本番でも有効
router.get('/search', rateLimiter, controller.search);
router.post('/query', rateLimiter, controller.query);
```

---

## 1. ツール定義（Function Calling）

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: 'search_documents',
        description: '社内ドキュメントをベクトル検索する',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: '検索クエリ' },
            limit: { type: 'NUMBER', description: '取得件数（デフォルト3）' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_current_date',
        description: '現在の日付を取得する',
        parameters: { type: 'OBJECT', properties: {} }
      },
      {
        name: 'calculate',
        description: '数式を計算する',
        parameters: {
          type: 'OBJECT',
          properties: {
            expression: { type: 'STRING', description: '計算式（例: 10 + 5）' }
          },
          required: ['expression']
        }
      }
    ]
  }
];
```

---

## 2. 型定義

```typescript
export interface AgentChatRequest {
  message: string;
}

export interface AgentChatResponse {
  answer: string;
  toolsUsed: string[];
  searchResults?: any[];
  executionTimeMs: number;
}
```

---

## 3. サービス実装詳細

```typescript
async chat(message: string): Promise<AgentChatResponse> {
  const start = Date.now();
  const toolsUsed: string[] = [];

  const chat = this.model.startChat({ tools });
  let result = await chat.sendMessage(message);
  let response = result.response;

  // Function Callingループ
  while (response.functionCalls()?.length) {
    const functionCall = response.functionCalls()[0];
    toolsUsed.push(functionCall.name);

    const toolResult = await this.executeTool(functionCall.name, functionCall.args);

    result = await chat.sendMessage([{
      functionResponse: { name: functionCall.name, response: toolResult }
    }]);
    response = result.response;
  }

  return {
    answer: response.text(),
    toolsUsed,
    executionTimeMs: Date.now() - start
  };
}

private async executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'search_documents':
      return await this.ragService.searchSimilar(args.query, args.limit ?? 3);
    case 'get_current_date':
      return { date: new Date().toISOString() };
    case 'calculate':
      return { result: eval(args.expression) }; // 本番ではmath-expressionライブラリ使用
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

**注意**: `eval()`は教育デモ用途のみ。本番では`mathjs`等を使用すること。

---

## 4. テスト方針

```typescript
describe('RagAgentService', () => {
  it('単純な質問はツールなしで回答する');
  it('ドキュメント検索が必要な質問はsearch_documentsを呼ぶ');
  it('計算が必要な場合はcalculateを呼ぶ');
  it('複数ツールを連続して使用できる');
});
```
