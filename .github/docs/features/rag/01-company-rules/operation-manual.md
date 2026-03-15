# RAG #01 就業規則Q&A - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev` または `docker compose up`）

---

## Step 1: Supabase セットアップ

Supabase SQL Editor で以下を実行する。

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ベクトル検索用インデックス
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 3
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, content, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Step 2: 就業規則テキストの登録

```bash
curl -X POST http://localhost:3000/node/rag/company-rules/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "就業規則第10条 年次有給休暇は勤続6ヶ月以上の従業員に10日付与されます。勤続1年6ヶ月以上は11日、2年6ヶ月以上は12日、3年6ヶ月以上は14日、4年6ヶ月以上は16日、5年6ヶ月以上は18日、6年6ヶ月以上は20日付与されます。有給休暇の申請は3日前までに直属の上司に届け出ること。",
    "source": "就業規則2024"
  }'
```

期待レスポンス:
```json
{
  "success": true,
  "chunkCount": 2,
  "executionTimeMs": 1200,
  "message": "2チャンクを登録しました"
}
```

---

## Step 3: 類似検索テスト

```bash
curl "http://localhost:3000/node/rag/company-rules/search?q=有給休暇&limit=3"
```

期待レスポンス:
```json
{
  "results": [
    {
      "content": "年次有給休暇は勤続6ヶ月以上の従業員に...",
      "similarity": 0.92,
      "metadata": { "source": "就業規則2024", "chunkIndex": 0, "totalChunks": 2 }
    }
  ],
  "executionTimeMs": 320
}
```

---

## Step 4: RAGクエリ（質問応答）

```bash
curl -X POST http://localhost:3000/node/rag/company-rules/query \
  -H "Content-Type: application/json" \
  -d '{"question": "有給は何日取れますか？"}'
```

期待レスポンス:
```json
{
  "answer": "年次有給休暇は勤続6ヶ月以上で10日付与されます。以降は勤続年数に応じて最大20日まで増加します。",
  "sources": [...],
  "executionTimeMs": 1800
}
```

---

## Step 5: データ削除（クリーンアップ）

```bash
curl -X DELETE http://localhost:3000/node/rag/company-rules/documents
```

---

## よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|-------|
| 400 MISSING_PARAM | textまたはquestionが未指定 | リクエストボディを確認 |
| 400 EMPTY_TEXT | text が空文字 | テキストを入力する |
| 400 NO_DOCUMENTS | ドキュメント未登録 | 先にingest APIを呼ぶ |
| 502 GEMINI_ERROR | Gemini API接続失敗 | GEMINI_API_KEY を確認 |
| 502 SUPABASE_ERROR | Supabase接続失敗 | SUPABASE_URL/ANON_KEY を確認 |
| 500 INTERNAL_ERROR | サーバー内部エラー | サーバーログを確認 |
