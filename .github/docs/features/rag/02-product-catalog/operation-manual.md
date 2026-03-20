# RAG #02 商品カタログ検索 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

---

## Step 2: 商品データの登録

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "商品名: スマートウォッチ ProX 価格: 49,800円 特徴: 防水IP68対応、心拍数モニタリング、GPS内蔵、バッテリー7日間。ディスプレイ: 1.4インチAMOLED。対応OS: iOS/Android。カラー: ブラック/シルバー/ゴールド。",
    "source": "electronics"
  }'
```

複数商品を登録する場合は繰り返し実行する:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "商品名: ワイヤレスイヤホン SoundPro 価格: 15,800円 特徴: ノイズキャンセリング対応、連続再生8時間、充電ケース付き。防水: IPX4。Bluetooth 5.2。",
    "source": "electronics"
  }'
```

---

## Step 3: 商品の類似検索

キーワードで類似商品を検索する:

```bash
curl "http://localhost:3000/node/rag/search?q=防水スマートウォッチ&limit=3"
```

```bash
curl "http://localhost:3000/node/rag/search?q=心拍数モニタリング&limit=5"
```

---

## Step 4: RAGクエリで商品推薦

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "防水機能があってGPS付きのスマートウォッチを教えてください"}'
```

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "5万円以下で買えるウェアラブルデバイスは何がありますか？"}'
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
| 400 MISSING_PARAM | text が未指定 | リクエストボディを確認 |
| 400 NO_DOCUMENTS | 商品未登録 | 先にingest APIを呼ぶ |
| 502 GEMINI_ERROR | Gemini API接続失敗 | GEMINI_API_KEY を確認 |
| 502 SUPABASE_ERROR | Supabase接続失敗 | 接続設定を確認 |

## 動作確認のポイント

- 登録した商品説明に含まれるキーワードで検索すると高い類似度スコアが返ること
- 意味的に類似する単語（例: 「腕時計」で「スマートウォッチ」が返る）での検索も確認する
