# RAG #13 LangSmith + Ragas評価 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#65](https://github.com/RYA234/typescript-container/issues/65)
- **ソース**: `src/rag/langsmith-ragas/`

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

## 1. 依存パッケージ

```bash
npm install langchain @langchain/core ragas
```

---

## 2. 環境変数追加

| 変数名 | 説明 |
|--------|------|
| LANGCHAIN_API_KEY | LangSmith APIキー（既存） |
| LANGCHAIN_TRACING_V2 | `true` に設定 |
| LANGCHAIN_PROJECT | プロジェクト名（例: `rag-evaluation`） |

---

## 3. 型定義

```typescript
export interface EvalQueryRequest {
  question: string;
  evaluate?: boolean;
}

export interface EvalScores {
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  overallScore: number;
}

export interface EvalQueryResponse {
  answer: string;
  evaluation?: EvalScores;
  langsmithTraceUrl?: string;
  executionTimeMs: number;
}

export interface TestCase {
  question: string;
  groundTruth: string;
}

export interface BatchEvalResponse {
  results: Array<EvalQueryResponse & { question: string }>;
  averageScores: EvalScores;
  executionTimeMs: number;
}
```

---

## 4. サービス実装詳細

### LangSmithトレース設定

```typescript
import { Client } from 'langsmith';
import { traceable } from 'langsmith/traceable';

const langsmithClient = new Client({
  apiKey: process.env.LANGCHAIN_API_KEY
});

// トレース付きRAGクエリ
const tracedQuery = traceable(
  async (question: string, contexts: string[]) => {
    return await generateAnswer(question, contexts.join('\n\n'));
  },
  { name: 'rag-query', client: langsmithClient }
);
```

### Ragas評価

```typescript
private async evaluateWithRagas(
  question: string,
  answer: string,
  contexts: string[]
): Promise<EvalScores> {
  // Ragas評価（Python Ragas SDKをHTTP経由で呼ぶ or JS実装）
  // 簡易版: Geminiで評価スコアを生成
  const prompt = `
以下のRAG回答を評価してください。0〜1のスコアで返してください。

質問: ${question}
回答: ${answer}
参照コンテキスト: ${contexts.join('\n')}

JSON形式で返してください:
{ "faithfulness": 0.0〜1.0, "answerRelevancy": 0.0〜1.0, "contextPrecision": 0.0〜1.0 }
  `;
  const result = await this.generativeModel.generateContent(prompt);
  const scores = JSON.parse(result.response.text());
  return {
    ...scores,
    overallScore: (scores.faithfulness + scores.answerRelevancy + scores.contextPrecision) / 3
  };
}
```

---

## 5. テスト方針

```typescript
describe('EvalService', () => {
  it('evaluate=trueのとき評価スコアを返す');
  it('evaluate=falseのとき評価なしで回答を返す');
  it('batchEval: 複数質問の平均スコアを返す');
});
```
