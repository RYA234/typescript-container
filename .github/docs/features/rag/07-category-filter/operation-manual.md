# RAG #07 カテゴリ別フィルタリング - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

カテゴリフィルタに対応するため、metadataのcategoryフィールドを使用するか、専用のcategory列を追加する:

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;
```

---

## Step 2: カテゴリ付きデータ登録

HRカテゴリのデータ:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "有給休暇申請: 直属上司への事前申請が必要。申請期限は休暇取得の3日前まで。病気の場合は事後申請可能。",
    "source": "HR"
  }'
```

ITカテゴリのデータ:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "システムアクセス申請: ITヘルプデスクへメールで申請。申請から3営業日で対応。緊急の場合は内線5678へ連絡。",
    "source": "IT"
  }'
```

Financeカテゴリのデータ:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "経費精算申請: 月次締め日は25日。経費精算システムから申請。上限金額は職位により異なる（一般職: 5万円/月）。",
    "source": "Finance"
  }'
```

---

## Step 3: カテゴリ指定なしの全体検索

```bash
curl "http://localhost:3000/node/rag/search?q=申請&limit=5"
```

全カテゴリ（HR, IT, Finance）から結果が返ることを確認する。

---

## Step 4: カテゴリ指定での絞り込み検索

```bash
# HRカテゴリのみ検索（実装依存: クエリパラメータ名は実装に合わせる）
curl "http://localhost:3000/node/rag/search?q=申請&category=HR&limit=3"
```

HRカテゴリのデータのみが返ることを確認する。

---

## Step 5: カテゴリフィルタ付きRAGクエリ

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "申請の手続きを教えてください",
    "category": "IT"
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
| カテゴリ指定しても全件返る | フィルタ未実装 | API実装を確認 |
| 400 Bad Request | qパラメータ未指定 | qを追加する |
| results.length == 0 | カテゴリ名の不一致 | 大文字小文字を確認 |
