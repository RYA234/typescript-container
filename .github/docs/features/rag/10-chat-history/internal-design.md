# RAG #10 会話履歴検索 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#62](https://github.com/RYA234/typescript-container/issues/62)
- **ソース**: `src/rag/chat-history/`

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
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'general',
    embedding VECTOR(768),
    posted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_embedding_idx
ON messages USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_messages(
    query_embedding VECTOR(768),
    filter_channel TEXT DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID, user_name TEXT, message TEXT,
    channel TEXT, posted_at TIMESTAMPTZ, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, user_name, message, channel, posted_at,
           1 - (embedding <=> query_embedding) AS similarity
    FROM messages
    WHERE (filter_channel IS NULL OR channel = filter_channel)
      AND 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 2. 型定義

```typescript
export interface PostMessageRequest {
  user: string;
  message: string;
  channel?: string;
}

export interface ChatSearchRequest {
  query: string;
  channel?: string;
  limit?: number;
}

export interface ChatSearchResult {
  user: string;
  message: string;
  channel: string;
  postedAt: string;
  similarity: number;
}

export interface ChatSearchResponse {
  results: ChatSearchResult[];
  executionTimeMs: number;
}
```

---

## 3. サービス実装詳細

### postMessage

```typescript
async postMessage(user: string, message: string, channel = 'general'): Promise<void> {
  const embedding = await this.generateEmbedding(message);
  await supabase.from('messages').insert({
    user_name: user,
    message,
    channel,
    embedding
  });
}
```

### searchChatHistory

```typescript
async searchChatHistory(
  query: string,
  channel?: string,
  limit = 5
): Promise<ChatSearchResponse> {
  const start = Date.now();
  const embedding = await this.generateEmbedding(query);
  const { data } = await supabase.rpc('match_messages', {
    query_embedding: embedding,
    filter_channel: channel ?? null,
    match_count: limit
  });

  return {
    results: data.map((d: any) => ({
      user: d.user_name,
      message: d.message,
      channel: d.channel,
      postedAt: d.posted_at,
      similarity: d.similarity
    })),
    executionTimeMs: Date.now() - start
  };
}
```

---

## 4. テスト方針

```typescript
describe('ChatHistoryService', () => {
  it('メッセージを投稿してベクトル化できる');
  it('過去の会話を意味検索できる');
  it('チャンネル指定で絞り込める');
});
```
