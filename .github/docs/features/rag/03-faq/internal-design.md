# RAG #03 FAQ自動回答 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#55](https://github.com/RYA234/typescript-container/issues/55)
- **ソース**: `src/rag/faq/`

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
src/rag/faq/
├── router.ts
├── controller.ts
├── service.ts
└── tests/
    └── faq.test.ts
```

---

## 2. DDL

```sql
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faqs_embedding_idx
ON faqs USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_faqs(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 1
)
RETURNS TABLE (
    id UUID, question TEXT, answer TEXT,
    category TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, question, answer, category,
           1 - (embedding <=> query_embedding) AS similarity
    FROM faqs
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 3. 型定義

```typescript
export interface Faq {
  question: string;
  answer: string;
  category?: string;
}

export interface FaqIngestRequest {
  faqs: Faq[];
}

export interface FaqAnswerRequest {
  question: string;
}

export interface FaqAnswerResponse {
  answer: string;
  matchedQuestion: string;
  similarity: number;
  category?: string;
  executionTimeMs: number;
  notFound?: boolean;
}
```

---

## 4. サービス実装詳細

### answerFaq

```typescript
async answerFaq(question: string): Promise<FaqAnswerResponse> {
  const start = Date.now();
  const embedding = await this.generateEmbedding(question);
  const { data } = await supabase.rpc('match_faqs', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 1
  });

  if (!data || data.length === 0) {
    return {
      answer: '該当するFAQが見つかりませんでした。',
      matchedQuestion: '',
      similarity: 0,
      notFound: true,
      executionTimeMs: Date.now() - start
    };
  }

  const matched = data[0];
  return {
    answer: matched.answer,
    matchedQuestion: matched.question,
    similarity: matched.similarity,
    category: matched.category,
    executionTimeMs: Date.now() - start
  };
}
```

**ポイント**: FAQはmatch_count=1で最も近い1件のみ返す（FAQは完全一致に近い回答が期待されるため）

---

## 5. テスト方針

```typescript
describe('FaqService', () => {
  it('ingestFaqs: FAQデータを登録できる');
  it('answerFaq: 類似質問に対して回答を返す');
  it('answerFaq: 類似度が低い場合はnotFound=trueを返す');
});
```
