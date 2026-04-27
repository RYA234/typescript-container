# RAG #14 ハイブリッド検索 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#66](https://github.com/RYA234/typescript-container/issues/66)
- **ソース**: `src/rag/hybrid-search/`

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
-- 全文検索用にtsvectorカラムを追加
CREATE TABLE IF NOT EXISTS hybrid_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(768),
    content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('japanese', content)) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ベクトルインデックス
CREATE INDEX IF NOT EXISTS hybrid_documents_embedding_idx
ON hybrid_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 全文検索インデックス
CREATE INDEX IF NOT EXISTS hybrid_documents_tsv_idx
ON hybrid_documents USING gin(content_tsv);

-- ベクトル検索
CREATE OR REPLACE FUNCTION vector_search(
    query_embedding VECTOR(768),
    match_count INT DEFAULT 10
)
RETURNS TABLE (id UUID, content TEXT, rank INT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
    SELECT id, content,
           ROW_NUMBER() OVER (ORDER BY embedding <=> query_embedding) AS rank,
           1 - (embedding <=> query_embedding) AS similarity
    FROM hybrid_documents
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;

-- キーワード検索
CREATE OR REPLACE FUNCTION keyword_search(
    query_text TEXT,
    match_count INT DEFAULT 10
)
RETURNS TABLE (id UUID, content TEXT, rank INT)
LANGUAGE sql STABLE AS $$
    SELECT id, content,
           ROW_NUMBER() OVER (ORDER BY ts_rank(content_tsv, plainto_tsquery('japanese', query_text)) DESC) AS rank
    FROM hybrid_documents
    WHERE content_tsv @@ plainto_tsquery('japanese', query_text)
    ORDER BY ts_rank(content_tsv, plainto_tsquery('japanese', query_text)) DESC
    LIMIT match_count;
$$;
```

---

## 2. 型定義

```typescript
export type SearchMode = 'vector' | 'keyword' | 'hybrid';

export interface HybridQueryRequest {
  question: string;
  searchMode?: SearchMode;
  vectorWeight?: number;
  keywordWeight?: number;
}

export interface HybridSource {
  content: string;
  vectorScore?: number;
  keywordScore?: number;
  hybridScore: number;
}

export interface HybridQueryResponse {
  answer: string;
  sources: HybridSource[];
  searchMode: SearchMode;
  executionTimeMs: number;
}
```

---

## 3. RRF実装

```typescript
private rrfScore(rank: number, k = 60): number {
  return 1 / (k + rank);
}

private mergeResults(
  vectorResults: Array<{ id: string; content: string; rank: number; similarity: number }>,
  keywordResults: Array<{ id: string; content: string; rank: number }>,
  vectorWeight = 0.5,
  keywordWeight = 0.5
): HybridSource[] {
  const scoreMap = new Map<string, HybridSource & { id: string }>();

  // ベクトル検索スコア
  for (const r of vectorResults) {
    scoreMap.set(r.id, {
      id: r.id,
      content: r.content,
      vectorScore: this.rrfScore(r.rank) * vectorWeight,
      hybridScore: this.rrfScore(r.rank) * vectorWeight
    });
  }

  // キーワード検索スコアをマージ
  for (const r of keywordResults) {
    const existing = scoreMap.get(r.id);
    const kwScore = this.rrfScore(r.rank) * keywordWeight;
    if (existing) {
      existing.keywordScore = kwScore;
      existing.hybridScore += kwScore;
    } else {
      scoreMap.set(r.id, { id: r.id, content: r.content, keywordScore: kwScore, hybridScore: kwScore });
    }
  }

  return [...scoreMap.values()]
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, 5);
}
```

---

## 4. テスト方針

```typescript
describe('HybridSearchService', () => {
  it('vectorモードはベクトル検索のみ使用');
  it('keywordモードはキーワード検索のみ使用');
  it('hybridモードはRRFでスコアを統合する');
  it('固有名詞はキーワード検索の精度が高い');
});
```
