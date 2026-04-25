# RAG #08 日付範囲フィルタリング - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

日付フィルタ用の列が必要な場合は追加する:

```sql
-- metadataのdateフィールドを活用するか、専用列を追加
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_date DATE;
CREATE INDEX IF NOT EXISTS documents_doc_date_idx ON documents (doc_date);
```

---

## Step 2: 日付付きデータ登録

```bash
# 2024年1月のデータ
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "2024年1月改定: 就業規則第5条を改定。フレックスタイム制度の適用範囲を全社員に拡大。コアタイムは10:00-15:00。",
    "source": "company-rules-2024-01"
  }'
```

```bash
# 2024年6月のデータ
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "2024年6月改定: テレワーク規定を改定。在宅勤務は週3日まで許可。通信費補助として月3,000円を支給。",
    "source": "company-rules-2024-06"
  }'
```

```bash
# 2023年のデータ
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "2023年4月改定: 賃金規定の改定。基本給の底上げ（平均3%増）。通勤手当の上限を月50,000円に変更。",
    "source": "company-rules-2023-04"
  }'
```

---

## Step 3: 日付範囲フィルタ付き検索

2024年のみのデータを検索（実装依存: クエリパラメータ名は実装に合わせる）:

```bash
curl "http://localhost:3000/node/rag/search?q=改定&from=2024-01-01&to=2024-12-31&limit=5"
```

2023年以前のデータのみ:

```bash
curl "http://localhost:3000/node/rag/search?q=改定&to=2023-12-31&limit=5"
```

---

## Step 4: 日付フィルタ付きRAGクエリ

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "2024年の就業規則改定内容を教えてください",
    "from": "2024-01-01",
    "to": "2024-12-31"
  }'
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
| 400 Bad Request (日付形式エラー) | ISO 8601形式（YYYY-MM-DD）以外 | 日付形式を修正 |
| results.length == 0 | 期間内にデータなし | データ登録日付を確認 |
| from > to エラー | 日付範囲が逆 | fromとtoを入れ替え |
| 502 SUPABASE_ERROR | DB接続失敗 | 接続設定を確認 |

## 日付フォーマット

- ISO 8601 形式: `YYYY-MM-DD`（例: `2024-03-13`）
- タイムゾーンは UTC を基準とする
- `created_at` は自動でタイムスタンプ（UTC）が記録される
