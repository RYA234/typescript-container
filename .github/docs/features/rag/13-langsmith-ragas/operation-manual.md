# RAG #13 LangSmith + Ragas評価 - 操作手順書

## 前提条件
- `.env` に `LANGCHAIN_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` が設定済み
- LangSmithアカウントが作成済み（https://smith.langchain.com）
- Ragas評価ライブラリがインストール済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: LangSmith セットアップ

`.env` に以下を追加する:

```env
LANGCHAIN_API_KEY=ls__xxxxxxxxxxxxxxxxxxxxxxxx
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=typescript-container-rag
```

LangSmithダッシュボード（https://smith.langchain.com）でプロジェクトを作成する。

---

## Step 2: RAGの回答品質を評価

評価APIを呼び出す:

```bash
curl -X POST http://localhost:3000/node/rag/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "有給休暇は何日もらえますか？",
    "answer": "年次有給休暇は勤続6ヶ月以上で10日付与されます。以降は勤続年数に応じて最大20日まで増加します。",
    "contexts": [
      "年次有給休暇は勤続6ヶ月以上の従業員に10日付与されます。勤続1年6ヶ月以上は11日、2年6ヶ月以上は12日。",
      "有給休暇の申請は3日前までに直属の上司に届け出ること。"
    ]
  }'
```

期待レスポンス:
```json
{
  "scores": {
    "faithfulness": 0.95,
    "answer_relevancy": 0.88,
    "context_precision": 0.92,
    "context_recall": 0.85
  },
  "overall": 0.90,
  "langsmithRunId": "run_xxxxxxxxxxxx"
}
```

---

## Step 3: RAGクエリ→評価の一連の流れ

まずドキュメントを登録する:

```bash
curl -X POST http://localhost:3000/node/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "有給休暇は勤続6ヶ月以上で10日付与。最大20日まで。申請は3日前まで。",
    "source": "hr-rules"
  }'
```

次にRAGクエリを実行する:

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "有給休暇の取得条件は？"}'
```

得られたanswerとsourcesを使って評価する:

```bash
curl -X POST http://localhost:3000/node/rag/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "有給休暇の取得条件は？",
    "answer": "<上記クエリのanswer>",
    "contexts": ["<上記クエリのsources[0].content>"]
  }'
```

---

## Step 4: LangSmithでトレースを確認

https://smith.langchain.com にアクセスし、プロジェクト `typescript-container-rag` を選択する。

評価結果のトレースが記録されていることを確認する。

---

## Step 5: データ削除（クリーンアップ）

```bash
curl -X DELETE http://localhost:3000/node/rag/documents
```

---

## よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|-------|
| 502 LANGSMITH_ERROR | LANGCHAIN_API_KEY が無効 | LangSmithダッシュボードでキーを確認 |
| 400 MISSING_PARAM | question/answer/contextsのいずれかが未指定 | リクエストボディを確認 |
| スコアが低い | 回答が文脈と無関係 | RAGの検索精度を改善する |

## Ragasスコアの意味

| スコア | 説明 | 目標値 |
|-------|------|-------|
| faithfulness | 回答が文脈に基づいているか | >= 0.8 |
| answer_relevancy | 回答が質問に関連しているか | >= 0.8 |
| context_precision | 検索された文脈が正確か | >= 0.7 |
| context_recall | 必要な文脈を網羅しているか | >= 0.7 |
