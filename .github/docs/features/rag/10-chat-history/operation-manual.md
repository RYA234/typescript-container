# RAG #10 会話履歴検索 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

会話履歴用のテーブルを追加（実装に応じて）:

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL,
  user_id TEXT,
  message TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Step 2: メッセージの投稿

```bash
curl -X POST http://localhost:3000/node/rag/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "general",
    "userId": "user001",
    "message": "来週の定例会議はリモートで行います。Zoomリンクは後で共有します。"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "tech",
    "userId": "user002",
    "message": "新しいAPIのドキュメントをConfluenceにアップしました。レビューお願いします。"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "general",
    "userId": "user003",
    "message": "本日のランチはビルの地下のカフェでチームランチを行います。12時集合。"
  }'
```

---

## Step 3: チャンネル別メッセージ検索

```bash
# generalチャンネルの会議関連メッセージを検索
curl "http://localhost:3000/node/rag/search?q=会議&channel=general&limit=3"
```

```bash
# techチャンネルのドキュメント関連を検索
curl "http://localhost:3000/node/rag/search?q=ドキュメント&channel=tech&limit=3"
```

---

## Step 4: 横断検索（全チャンネル）

```bash
curl "http://localhost:3000/node/rag/search?q=ミーティング&limit=5"
```

---

## Step 5: 会話履歴に基づくRAGクエリ

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "来週の定例会議はどのように行われますか？"}'
```

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "APIドキュメントはどこにありますか？"}'
```

---

## Step 6: データ削除（クリーンアップ）

```bash
curl -X DELETE http://localhost:3000/node/rag/documents
```

---

## よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|-------|
| 400 MISSING_PARAM | message未指定 | リクエストボディを確認 |
| 検索結果がゼロ | 投稿したチャンネルと検索チャンネルの不一致 | チャンネル名を確認 |
| 502 GEMINI_ERROR | Gemini API接続失敗 | GEMINI_API_KEY を確認 |
