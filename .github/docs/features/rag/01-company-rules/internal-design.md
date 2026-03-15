# RAG #01 就業規則Q&A - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 🚧 設計中

---

## 1. ディレクトリ構成

```
src/rag/
├── index.ts
├── router.ts
├── controller.ts
├── service.ts
├── data/
│   └── company-rules.txt
└── tests/
    └── rag.test.ts
```

---

## 2. DDL

```sql
-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- ドキュメントテーブル
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ベクトル検索用インデックス
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 類似検索RPC関数
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 3. 型定義

```typescript
// src/interfaces/rag.ts

export interface IngestRequest {
  text: string;
  source?: string;
}

export interface IngestResponse {
  success: boolean;
  chunkCount: number;
  executionTimeMs: number;
  message: string;
}

export interface SearchRequest {
  q: string;
  limit?: number;
}

export interface SearchResult {
  content: string;
  similarity: number;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  executionTimeMs: number;
  message: string;
}

export interface RagQueryRequest {
  question: string;
}

export interface RagQueryResponse {
  answer: string;
  sources: SearchResult[];
  executionTimeMs: number;
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
```

---

## 4. サービス実装詳細

### 4.1 chunkText

```typescript
private chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}
```

- チャンクサイズ: 500文字
- オーバーラップ: 50文字（文脈の連続性確保）

### 4.2 generateEmbedding

```typescript
private async generateEmbedding(text: string): Promise<number[]> {
  const result = await this.embeddingModel.embedContent(text);
  return result.embedding.values;
}
```

- モデル: `text-embedding-004`
- 次元数: 768

### 4.3 generateAnswer

```typescript
private async generateAnswer(question: string, context: string): Promise<string> {
  const prompt = `
以下のコンテキストのみを使って質問に答えてください。
コンテキストに答えがない場合は「情報が見つかりませんでした」と答えてください。

コンテキスト:
${context}

質問: ${question}
  `;
  const result = await this.generativeModel.generateContent(prompt);
  return result.response.text();
}
```

---

## 5. テスト方針

```typescript
// tests/rag.test.ts
describe('RagService', () => {
  it('ingestText: テキストをチャンク分割してSupabaseに登録できる');
  it('ingestText: 空テキストは400エラー');
  it('searchSimilar: クエリに近いチャンクを返す');
  it('searchSimilar: ドキュメント未登録の場合は空配列を返す');
  it('queryRag: 質問に対して回答と参照元を返す');
  it('deleteAllDocuments: 全ドキュメントを削除できる');
});
```

---

## 6. 環境変数

| 変数名 | 説明 |
|--------|------|
| GEMINI_API_KEY | Gemini API キー（既存） |
| SUPABASE_URL | Supabase URL（既存） |
| SUPABASE_ANON_KEY | Supabase Anon Key（既存） |

追加の環境変数なし。既存設定で動作する。
