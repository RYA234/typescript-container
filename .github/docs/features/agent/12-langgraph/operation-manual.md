# 運用マニュアル - LangGraphエージェント

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | 必須 |
| 環境変数 LANGCHAIN_API_KEY | オプション（LangSmith トレーシング用） |
| npm パッケージ | @langchain/langgraph, @langchain/google-genai |

## セットアップ手順

```bash
npm install @langchain/langgraph @langchain/google-genai
cp .env.example .env
# GEMINI_API_KEY を設定
# LANGCHAIN_API_KEY は任意（LangSmith でトレースしたい場合）
npm run dev
```

## curl コマンド例

### 検索フロー

```bash
curl -X POST http://localhost:3000/node/agent/langgraph/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "東京の人口を検索してください"}'
```

### 計算フロー

```bash
curl -X POST http://localhost:3000/node/agent/langgraph/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "東京と大阪の人口の合計を計算してください"}'
```

### 直接回答フロー

```bash
curl -X POST http://localhost:3000/node/agent/langgraph/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "日本の首都はどこですか？"}'
```

## レスポンス例

```json
{
  "reply": "東京都の人口は約 1,400 万人です。",
  "graphPath": ["START", "classify", "search", "answer", "END"],
  "state": {
    "messageType": "search",
    "searchResult": "東京都人口: 約 1,400 万人"
  }
}
```

## グラフパス一覧

| パス | 条件 |
|------|------|
| START → classify → search → answer → END | 検索が必要な質問 |
| START → classify → calculate → answer → END | 計算が必要な質問 |
| START → classify → answer → END | 直接回答できる質問 |

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| 400 Bad Request | message なし | リクエストを確認 |
| 503 | Gemini API 障害 | リトライ |
| "LangGraph 構築失敗" | パッケージ未インストール | npm install を実行 |

## LangSmith トレーシング設定（任意）

```bash
export LANGCHAIN_API_KEY=<your-key>
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_PROJECT=typescript-container
```
