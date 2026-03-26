# RAG #06 複数ドキュメント横断検索 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: ✅ 実装完了
- **Issue**: [#58](https://github.com/RYA234/typescript-container/issues/58)
- **ソース**: `src/rag/multi-doc/`

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
src/rag/multi-doc/
├── router.ts
├── controller.ts
├── service.ts
└── tests/
    └── multi-doc.test.ts
```

---

## 2. DDL

```sql
CREATE TABLE IF NOT EXISTS multi_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    document_type TEXT NOT NULL,
    title TEXT,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat インデックスは作成しない
-- 理由: lists=100 に対してレコード数が少ない場合、全件スキップされて結果が空になる
-- レコード数が lists を大幅に超えたら追加を検討:
-- CREATE INDEX multi_documents_embedding_idx ON multi_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- documentTypeフィルタなしで全件検索
CREATE OR REPLACE FUNCTION match_all_documents(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID, content TEXT, document_type TEXT,
    title TEXT, metadata JSONB, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, content, document_type, title, metadata,
           1 - (embedding <=> query_embedding) AS similarity
    FROM multi_documents
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 3. 型定義

```typescript
export type DocumentType = 'employment_rules' | 'manual' | 'minutes' | string;

export interface MultiDocIngestRequest {
  text: string;
  documentType: DocumentType;
  title?: string;
}

export interface MultiDocQueryRequest {
  question: string;
}

export interface MultiDocSource {
  content: string;
  documentType: DocumentType;
  title?: string;
  similarity: number;
}

export interface MultiDocQueryResponse {
  answer: string;
  sources: MultiDocSource[];
  executionTimeMs: number;
}
```

---

## 4. サービス実装詳細

### queryMultiDoc

```typescript
async queryMultiDoc(question: string): Promise<MultiDocQueryResponse> {
  const start = Date.now();
  const embedding = await this.generateEmbedding(question);
  const { data } = await supabase.rpc('match_all_documents', {
    query_embedding: embedding,
    match_count: 5
  });

  const context = data.map((d: any) =>
    `[${d.document_type}] ${d.title ?? ''}\n${d.content}`
  ).join('\n\n');

  const answer = await this.generateAnswer(question, context);

  return {
    answer,
    sources: data.map((d: any) => ({
      content: d.content,
      documentType: d.document_type,
      title: d.title,
      similarity: d.similarity
    })),
    executionTimeMs: Date.now() - start
  };
}
```

**ポイント**: contextにdocument_typeを含めることで、Geminiが「就業規則によると」「マニュアルによると」など出典を意識した回答を生成しやすくなる。

---

## 5. テスト方針

```typescript
describe('MultiDocService', () => {
  it('ingest: 複数タイプのドキュメントを登録できる');
  it('queryMultiDoc: 複数ドキュメントを横断して回答できる');
  it('queryMultiDoc: sourcesに参照元ドキュメントタイプが含まれる');
});
```
