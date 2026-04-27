# RAG #12 根拠スコア表示 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

---

## Step 2: テスト用データの登録

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "有給休暇は年間20日付与されます。繰越は最大20日まで可能です。申請は3日前までに上司へ届け出ること。",
    "source": "hr-rules"
  }'
```

---

## Step 3: スコア付き類似検索

```bash
curl "http://localhost:3000/node/rag/search?q=有給休暇の日数&limit=3"
```

期待レスポンス:
```json
{
  "results": [
    {
      "content": "有給休暇は年間20日付与されます...",
      "similarity": 0.92,
      "confidence": "HIGH",
      "metadata": { "source": "hr-rules" }
    }
  ],
  "executionTimeMs": 320
}
```

---

## Step 4: 信頼度スコアの判定基準確認

HIGH（高信頼）の確認:

```bash
# 登録テキストと同じキーワードで検索 → similarity >= 0.8
curl "http://localhost:3000/node/rag/search?q=有給休暇 年間20日&limit=3"
```

MEDIUM（中信頼）の確認:

```bash
# 関連するが表現が異なるキーワード → 0.6 <= similarity < 0.8
curl "http://localhost:3000/node/rag/search?q=休暇制度&limit=3"
```

LOW（低信頼）の確認:

```bash
# やや関連するキーワード → 0.5 <= similarity < 0.6
curl "http://localhost:3000/node/rag/search?q=休み&limit=3"
```

---

## Step 5: RAGクエリでのスコア表示

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "有給休暇は何日もらえますか？"}'
```

期待レスポンス:
```json
{
  "answer": "有給休暇は年間20日付与されます...",
  "overall_confidence": "HIGH",
  "sources": [
    {
      "content": "有給休暇は年間20日付与されます...",
      "similarity": 0.92,
      "confidence": "HIGH"
    }
  ],
  "executionTimeMs": 1800
}
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
| confidence が undefined | スコア判定未実装 | サービス実装を確認 |
| similarity が閾値未満で結果なし | 検索ワードの類似度不足 | より具体的なキーワードで検索 |
| スコアが常に同じ | ベクトル生成の問題 | Gemini APIキーを確認 |

## 信頼度判定基準

| 判定 | similarity範囲 | 意味 |
|-----|--------------|------|
| HIGH | >= 0.8 | 高い信頼性。根拠として強く支持 |
| MEDIUM | 0.6 - 0.8 | 中程度の信頼性。参考情報として使用 |
| LOW | 0.5 - 0.6 | 低い信頼性。別途確認を推奨 |
| - | < 0.5 | 閾値未満のため結果に含まれない |
