# RAG #07 カテゴリ別フィルタリング - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#59](https://github.com/RYA234/typescript-container/issues/59)
- **ソース**: `src/rag/category-filter/`

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
CREATE TABLE IF NOT EXISTS filtered_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    department TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS filtered_documents_embedding_idx
ON filtered_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- カテゴリフィルタ付き検索
CREATE OR REPLACE FUNCTION match_filtered_documents(
    query_embedding VECTOR(768),
    filter_category TEXT,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID, content TEXT, category TEXT,
    department TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, content, category, department,
           1 - (embedding <=> query_embedding) AS similarity
    FROM filtered_documents
    WHERE category = filter_category
      AND 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 2. 型定義

```typescript
export interface FilteredIngestRequest {
  text: string;
  category: string;
  department?: string;
}

export interface FilteredQueryRequest {
  question: string;
  category: string;
}

export interface FilteredQueryResponse {
  answer: string;
  filteredBy: string;
  sources: Array<{ content: string; similarity: number }>;
  executionTimeMs: number;
}
```

---

## 3. サービス実装詳細

```typescript
async queryWithFilter(question: string, category: string): Promise<FilteredQueryResponse> {
  const start = Date.now();
  const embedding = await this.generateEmbedding(question);
  const { data } = await supabase.rpc('match_filtered_documents', {
    query_embedding: embedding,
    filter_category: category,
    match_count: 3
  });

  const context = data.map((d: any) => d.content).join('\n\n');
  const answer = await this.generateAnswer(question, context);

  return {
    answer,
    filteredBy: category,
    sources: data,
    executionTimeMs: Date.now() - start
  };
}
```

---

## 4. テスト方針

```typescript
describe('FilteredService', () => {
  it('カテゴリ指定で絞り込み検索できる');
  it('別カテゴリのドキュメントは返さない');
});
```
