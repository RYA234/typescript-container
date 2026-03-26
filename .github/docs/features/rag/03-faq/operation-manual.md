# RAG #03 FAQ自動回答 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

---

## Step 2: FAQデータの登録

Q&Aペアをテキスト形式で登録する:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Q: パスワードを忘れた場合はどうすればよいですか？\nA: ログイン画面の「パスワードを忘れた方」リンクから再設定できます。登録メールアドレスにリセットリンクが送信されます。メールが届かない場合はIT部門（内線1234）にお問い合わせください。",
    "source": "faq-it"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Q: 有給休暇の申請方法を教えてください。\nA: 社内ポータルの「勤怠管理」→「有給申請」から申請してください。申請は3日前までに行い、直属の上司の承認が必要です。",
    "source": "faq-hr"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Q: 経費精算の締め日はいつですか？\nA: 毎月25日が締め日です。25日までに経費精算システムに入力し、領収書を経理部へ提出してください。",
    "source": "faq-accounting"
  }'
```

---

## Step 3: FAQ検索（類似検索）

```bash
curl "http://localhost:3000/node/rag/search?q=パスワードリセット&limit=3"
```

---

## Step 4: FAQ自動回答（RAGクエリ）

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "ログインできなくなってしまいました"}'
```

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "休暇を取りたいのですが手続きは？"}'
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
| 400 MISSING_PARAM | text/question が未指定 | リクエストボディを確認 |
| 400 NO_DOCUMENTS | FAQ未登録 | 先にingest APIを呼ぶ |
| 502 GEMINI_ERROR | Gemini API接続失敗 | GEMINI_API_KEY を確認 |

## FAQ登録のベストプラクティス

- Q&Aの形式（Q: ... A: ...）で登録すると検索精度が上がる
- sourceでカテゴリ分け（faq-hr, faq-it, faq-accountingなど）することで管理しやすくなる
- 同じ質問の言い回しを複数パターン登録すると回答精度が向上する
