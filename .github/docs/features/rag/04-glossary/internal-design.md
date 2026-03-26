# RAG #04 社内用語集検索 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#56](https://github.com/RYA234/typescript-container/issues/56)
- **ソース**: `src/rag/glossary/`

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

## 1. ディレクトリ構成

```
src/rag/glossary/
├── router.ts
├── controller.ts
├── service.ts
└── tests/
    └── glossary.test.ts
```

---

## 2. DDL

```sql
CREATE TABLE IF NOT EXISTS glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    category TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS glossary_embedding_idx
ON glossary USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_terms(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.6,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID, term TEXT, definition TEXT,
    category TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, term, definition, category,
           1 - (embedding <=> query_embedding) AS similarity
    FROM glossary
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 3. 型定義

```typescript
export interface GlossaryTerm {
  term: string;
  definition: string;
  category?: string;
}

export interface GlossarySearchResponse {
  results: Array<GlossaryTerm & { similarity: number }>;
  executionTimeMs: number;
}
```

---

## 4. サービス実装詳細

### searchGlossary

```typescript
async searchGlossary(query: string, limit = 5): Promise<GlossarySearchResponse> {
  const start = Date.now();
  // 用語集は閾値を0.6に下げる（略語など短いテキストは類似度が出にくいため）
  const embedding = await this.generateEmbedding(query);
  const { data } = await supabase.rpc('match_terms', {
    query_embedding: embedding,
    match_threshold: 0.6,
    match_count: limit
  });
  return { results: data ?? [], executionTimeMs: Date.now() - start };
}
```

**ポイント**: 略語（YMS、ERPなど）は短いテキストで類似度が出にくいため、閾値を0.6に設定する。

---

## 5. テスト方針

```typescript
describe('GlossaryService', () => {
  it('ingestTerms: 用語データを登録できる');
  it('searchGlossary: 略語でも類似用語を返す');
  it('searchGlossary: 完全一致の用語が最上位に来る');
});
```
