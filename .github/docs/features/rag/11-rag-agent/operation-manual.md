# RAG #11 RAG + エージェント連携 - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- エージェントが使用するツール（RAG検索、計算など）が実装済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

---

## Step 2: エージェントが参照するドキュメントを登録

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "社内規定: 出張手当は1日につき3,000円。宿泊費は上限15,000円/泊。新幹線はグリーン車不可。飛行機はエコノミークラスを使用すること。",
    "source": "travel-policy"
  }'
```

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "有給休暇残日数の計算方法: 入社月から6ヶ月後に10日付与。以降は1年ごとに付与日数が増加。最大20日まで繰越可能。",
    "source": "hr-policy"
  }'
```

---

## Step 3: エージェントへの質問（RAGツールを自律選択）

```bash
curl -X POST http://localhost:3000/node/rag/agent \
  -H "Content-Type: application/json" \
  -d '{"question": "3泊4日の出張の手当の合計を計算してください"}'
```

期待レスポンス:
```json
{
  "answer": "3泊4日の出張手当は...\n出張手当: 3,000円 × 4日 = 12,000円\n宿泊費（上限）: 15,000円 × 3泊 = 45,000円\n合計: 57,000円",
  "toolCalls": [
    { "tool": "rag_search", "query": "出張手当" },
    { "tool": "calculator", "expression": "3000 * 4 + 15000 * 3" }
  ],
  "executionTimeMs": 3500
}
```

---

## Step 4: ツールなしの直接回答

```bash
curl -X POST http://localhost:3000/node/rag/agent \
  -H "Content-Type: application/json" \
  -d '{"question": "TypeScriptとJavaScriptの違いを教えてください"}'
```

ツールを使わず直接回答することを確認する。

---

## Step 5: 複数ツールの連続使用

```bash
curl -X POST http://localhost:3000/node/rag/agent \
  -H "Content-Type: application/json" \
  -d '{"question": "有給が10日残っている場合、全部取得すると何週間分になりますか？"}'
```

RAG検索（有給規定確認）→計算ツール（週換算）の順に実行されることを確認する。

---

## Step 6: データ削除（クリーンアップ）

```bash
curl -X DELETE http://localhost:3000/node/rag/documents
```

---

## よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|-------|
| 400 MISSING_PARAM | questionが未指定 | リクエストボディを確認 |
| ツールが選択されない | 登録ドキュメントが少ない | 関連ドキュメントを追加登録 |
| 502 GEMINI_ERROR | Function Calling非対応モデル | gemini-1.5-flash以上を使用 |
| 無限ループ | ツール選択ロジックのバグ | 最大反復回数の設定を確認 |

## 利用可能なツール

| ツール名 | 説明 |
|---------|------|
| rag_search | Supabaseに登録された文書を検索 |
| calculator | 数値計算を実行 |
| (その他実装したツール) | - |
