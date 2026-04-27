# RAG #14 ハイブリッド検索 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- 全文検索インデックスが作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

ハイブリッド検索用の全文検索インデックスを追加する:

```sql
-- 全文検索インデックス（日本語対応）
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX IF NOT EXISTS documents_fts_idx ON documents USING GIN (fts);

-- キーワード検索用の関数
CREATE OR REPLACE FUNCTION keyword_search_documents(
  query_text TEXT,
  match_count INT DEFAULT 10
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, rank FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, content, metadata,
    ts_rank(fts, to_tsquery('simple', query_text)) AS rank
  FROM documents
  WHERE fts @@ to_tsquery('simple', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
$$;
```

---

## Step 2: テスト用データの登録

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "有給休暇の申請手続き: 年次有給休暇は年間20日付与されます。申請は3日前までに勤怠管理システムから行うこと。緊急の場合は電話連絡後に事後申請可能。",
    "source": "hr-manual"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "テレワーク規定: 在宅勤務は週3日まで許可。開始前に上司へ連絡。コアタイム10:00-15:00は必ず稼働すること。通信費補助として月3,000円支給。",
    "source": "telework-policy"
  }'
```

---

## Step 3: ハイブリッド検索の実行

```bash
curl "http://localhost:3000/node/rag/hybrid-search?q=有給休暇&limit=3"
```

期待レスポンス:
```json
{
  "results": [
    {
      "content": "有給休暇の申請手続き: ...",
      "similarity": 0.89,
      "keyword_rank": 0.75,
      "rrf_score": 0.035,
      "metadata": { "source": "hr-manual" }
    }
  ],
  "searchType": "hybrid",
  "executionTimeMs": 450
}
```

---

## Step 4: 検索方式の比較

ベクトル検索のみ:

```bash
curl "http://localhost:3000/node/rag/search?q=休暇の手続き&limit=3"
```

ハイブリッド検索:

```bash
curl "http://localhost:3000/node/rag/hybrid-search?q=休暇の手続き&limit=3"
```

結果の順位と内容を比較する。

---

## Step 5: ハイブリッド検索によるRAGクエリ

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "有給休暇の申請方法を教えてください",
    "searchType": "hybrid"
  }'
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
| キーワード検索が機能しない | 全文検索インデックス未作成 | SQLインデックスを作成する |
| ハイブリッド結果がベクトル検索と同じ | RRF統合未実装 | hybrid-search エンドポイントの実装を確認 |
| 400 Bad Request | qパラメータ未指定 | qを追加する |

## RRF（Reciprocal Rank Fusion）について

RRFは複数の検索結果を統合するアルゴリズム。

スコア計算式: `RRF(d) = Σ 1 / (k + rank(d))`（k=60が一般的）

- ベクトル検索ランキングとキーワード検索ランキングを統合
- どちらの検索でも上位にランクされた文書が高スコアを得る
