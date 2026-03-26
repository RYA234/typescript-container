# RAG #06 複数ドキュメント横断検索 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

document_type別の管理が必要な場合、metadataフィールドを活用する。

---

## Step 2: 複数document_typeでデータ登録

マニュアル文書を登録:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "操作マニュアル: 経費申請システムの使い方。1. ログイン後、「経費申請」メニューを選択。2. 申請日・金額・目的を入力。3. 領収書をアップロード。4. 承認者を選択して提出。",
    "source": "manual"
  }'
```

社内ポリシー文書を登録:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "経費申請ポリシー: 交通費は実費精算。1回の会食は上限5,000円。出張旅費は事前申請が必要。領収書のない経費は認められない。",
    "source": "policy"
  }'
```

FAQ文書を登録:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Q: 経費申請の締め日はいつですか？ A: 毎月25日締めです。Q: 領収書を紛失した場合は？ A: 再発行依頼書を提出してください。",
    "source": "faq"
  }'
```

---

## Step 3: 横断検索（全document_type）

```bash
curl "http://localhost:3000/node/rag/search?q=経費申請&limit=5"
```

複数のsource（manual, policy, faq）から結果が返ることを確認する。

---

## Step 4: document_type別フィルタ検索

APIでフィルタリングをサポートしている場合:

```bash
# policyのみ検索（実装依存）
curl "http://localhost:3000/node/rag/search?q=経費申請&source=policy&limit=3"
```

---

## Step 5: 複数ドキュメントを参照したRAGクエリ

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "経費申請の手順とルールを教えてください"}'
```

レスポンスの `sources` に複数の document_type が含まれることを確認する。

---

## Step 6: データ削除（クリーンアップ）

```bash
curl -X DELETE http://localhost:3000/node/rag/documents
```

---

## よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|-------|
| 特定ドキュメントが検索されない | 類似度が閾値未満 | limit を増やすか閾値を下げる |
| 400 NO_DOCUMENTS | 未登録 | ingest APIを先に呼ぶ |
| sourcesが1件のみ | 関連文書が1種類のみ | 複数document_typeのデータを確認 |
