# RAG #12 根拠スコア表示 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#64](https://github.com/RYA234/typescript-container/issues/64)
- **ソース**: `src/rag/score-display/`

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

## 1. 型定義

```typescript
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ScoredSource {
  content: string;
  similarity: number;
  documentTitle?: string;
  chunkIndex?: number;
  confidenceLevel: ConfidenceLevel;
}

export interface ScoredQueryRequest {
  question: string;
  confidenceThreshold?: number;
}

export interface ScoredQueryResponse {
  answer: string;
  confidence: ConfidenceLevel;
  sources: ScoredSource[];
  warning: string | null;
  executionTimeMs: number;
}
```

---

## 2. サービス実装詳細

### calcConfidenceLevel

```typescript
private calcConfidenceLevel(similarity: number): ConfidenceLevel {
  if (similarity >= 0.85) return 'HIGH';
  if (similarity >= 0.7) return 'MEDIUM';
  return 'LOW';
}
```

### queryWithScore

```typescript
async queryWithScore(
  question: string,
  threshold = 0.7
): Promise<ScoredQueryResponse> {
  const start = Date.now();
  const embedding = await this.generateEmbedding(question);
  const { data } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: 5
  });

  const sources: ScoredSource[] = data.map((d: any) => ({
    content: d.content,
    similarity: d.similarity,
    documentTitle: d.metadata?.source,
    confidenceLevel: this.calcConfidenceLevel(d.similarity)
  }));

  // 最高スコアから全体の信頼度を判定
  const maxSimilarity = Math.max(...sources.map(s => s.similarity), 0);
  const confidence = this.calcConfidenceLevel(maxSimilarity);

  const context = data.map((d: any) => d.content).join('\n\n');
  const answer = await this.generateAnswer(question, context);

  const warning = confidence === 'LOW'
    ? '関連情報が不足している可能性があります。回答の精度が低い場合があります。'
    : null;

  return { answer, confidence, sources, warning, executionTimeMs: Date.now() - start };
}
```

---

## 3. テスト方針

```typescript
describe('ScoredService', () => {
  it('similarityが0.85以上ならHIGH');
  it('similarityが0.7〜0.85ならMEDIUM');
  it('similarityが0.7未満ならLOWでwarningあり');
});
```
