# RAG #04 社内用語集検索 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み（閾値: 0.6）
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

注意: `match_documents` 関数のデフォルト閾値を 0.6 に設定する場合は以下の通り:

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.6,  -- 用語集は0.6閾値
  match_count INT DEFAULT 5
)
...
```

---

## Step 2: 用語集データの登録

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "RAG (Retrieval-Augmented Generation): 検索拡張生成。大規模言語モデルが外部データベースから関連情報を取得し、その情報をもとに回答を生成する技術。社内ドキュメントへの適用により、最新情報に基づいた回答が可能になる。",
    "source": "glossary"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "ベクトル埋め込み (Vector Embedding): テキストや画像などのデータを数値ベクトルに変換したもの。意味的な類似度を計算するために使用される。Geminiのtext-embedding-004モデルは768次元のベクトルを生成する。",
    "source": "glossary"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "pgvector: PostgreSQLの拡張機能で、ベクトルデータの格納と類似検索を可能にする。SupabaseはPostgreSQLベースのため、pgvectorを使ったRAGシステムの構築が可能。",
    "source": "glossary"
  }'
```

---

## Step 3: 用語の検索

```bash
curl "http://localhost:3000/node/rag/search?q=RAG&limit=3"
```

```bash
curl "http://localhost:3000/node/rag/search?q=ベクトル検索&limit=5"
```

---

## Step 4: 用語の定義取得（RAGクエリ）

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "RAGとは何ですか？どのような技術ですか？"}'
```

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "pgvectorはどのように使いますか？"}'
```

---

## Step 5: データ削除（クリーンアップ）

```bash
curl -X DELETE http://localhost:3000/node/rag/documents
```

---

## よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|-------|
| 検索結果が空 | 類似度が閾値0.6未満 | より関連性の高いキーワードで再検索 |
| 400 MISSING_PARAM | パラメータ未指定 | リクエストを確認 |
| 502 GEMINI_ERROR | Gemini API接続失敗 | GEMINI_API_KEY を確認 |

## 閾値0.6の意味

- 0.6以上: 関連性あり（用語集に該当する定義が存在）
- 0.6未満: 関連性なし（登録されていない用語）
- 一般的なRAGの閾値（0.5）より厳しく設定することで、無関係な結果を排除
