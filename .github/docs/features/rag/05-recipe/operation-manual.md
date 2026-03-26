# RAG #05 料理レシピ検索 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `recipes` テーブルと `match_recipes` 関数が作成済み（DDLは内部設計書参照）
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

---

## Step 2: レシピデータの登録

食材と手順を含むレシピテキストを登録する:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "レシピ名: チキントマト煮込み\n食材: 鶏もも肉300g、トマト缶1缶、玉ねぎ1個、にんにく2片、オリーブオイル、塩、こしょう、バジル\n手順: 1. 鶏肉を一口大に切り、塩こしょうする。2. フライパンでにんにくを炒め、鶏肉を加えて焼く。3. 玉ねぎを加えて炒め、トマト缶を入れて20分煮込む。4. 塩で味を調え、バジルを散らして完成。\nカロリー: 約350kcal",
    "source": "recipe"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "レシピ名: 野菜炒め\n食材: キャベツ200g、にんじん1本、もやし100g、豚バラ肉150g、ごま油、醤油、みりん、塩\n手順: 1. 野菜を食べやすい大きさに切る。2. 豚肉を炒め、野菜を加えて強火で炒める。3. 醤油・みりんで味付けして完成。\nカロリー: 約280kcal",
    "source": "recipe"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "レシピ名: 卵なしバナナパンケーキ\n食材: バナナ2本、薄力粉100g、牛乳100ml、ベーキングパウダー小さじ1、砂糖大さじ2、バター\n手順: 1. バナナをつぶし、薄力粉・牛乳・ベーキングパウダー・砂糖を混ぜる。2. フライパンにバターを溶かし、生地を焼く。\nアレルギー: 卵不使用",
    "source": "recipe"
  }'
```

---

## Step 3: 食材での類似検索

```bash
curl "http://localhost:3000/node/rag/search?q=鶏肉 トマト&limit=3"
```

```bash
curl "http://localhost:3000/node/rag/search?q=炒め物 野菜&limit=5"
```

---

## Step 4: レシピ提案（RAGクエリ）

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "冷蔵庫に鶏肉とトマト缶があります。何か作れますか？"}'
```

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "卵アレルギーがあるのでデザートを作りたいです"}'
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
| 検索結果が空 | 類似レシピ未登録 | レシピデータを追加登録する |
| 400 NO_DOCUMENTS | レシピ未登録 | ingest APIを先に呼ぶ |
| 502 GEMINI_ERROR | Gemini API接続失敗 | GEMINI_API_KEY を確認 |

## 登録データのポイント

- 食材名を明記する（「鶏もも肉300g」「トマト缶1缶」など）
- アレルギー情報をテキストに含めると、除外検索の精度が上がる
- カロリー情報を含めると栄養面の質問にも回答可能
