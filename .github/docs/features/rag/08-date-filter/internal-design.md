# RAG #08 日付範囲フィルタリング - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#60](https://github.com/RYA234/typescript-container/issues/60)
- **ソース**: `src/rag/date-filter/`

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

## 1. DDL

```sql
CREATE TABLE IF NOT EXISTS dated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    title TEXT,
    document_date DATE NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dated_documents_embedding_idx
ON dated_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_dated_documents(
    query_embedding VECTOR(768),
    date_from DATE,
    date_to DATE,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID, content TEXT, title TEXT,
    document_date DATE, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, content, title, document_date,
           1 - (embedding <=> query_embedding) AS similarity
    FROM dated_documents
    WHERE document_date BETWEEN date_from AND date_to
      AND 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 2. 型定義

```typescript
export interface DatedIngestRequest {
  text: string;
  title?: string;
  documentDate: string; // ISO 8601: YYYY-MM-DD
}

export interface DatedQueryRequest {
  question: string;
  dateFrom: string;
  dateTo: string;
}

export interface DatedQueryResponse {
  answer: string;
  dateRange: { from: string; to: string };
  sources: Array<{ title?: string; documentDate: string; similarity: number }>;
  executionTimeMs: number;
}
```

---

## 3. サービス実装詳細

```typescript
async queryWithDateRange(
  question: string,
  dateFrom: string,
  dateTo: string
): Promise<DatedQueryResponse> {
  const start = Date.now();
  const embedding = await this.generateEmbedding(question);
  const { data } = await supabase.rpc('match_dated_documents', {
    query_embedding: embedding,
    date_from: dateFrom,
    date_to: dateTo,
    match_count: 3
  });

  const context = data.map((d: any) =>
    `[${d.document_date}] ${d.title ?? ''}\n${d.content}`
  ).join('\n\n');

  const answer = await this.generateAnswer(question, context);
  return { answer, dateRange: { from: dateFrom, to: dateTo }, sources: data, executionTimeMs: Date.now() - start };
}
```

---

## 4. テスト方針

```typescript
describe('DatedService', () => {
  it('日付範囲内のドキュメントのみ検索する');
  it('範囲外のドキュメントは返さない');
});
```
