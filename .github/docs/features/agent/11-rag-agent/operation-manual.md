# 運用マニュアル - RAG + エージェント連携

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | 必須 |
| 環境変数 SUPABASE_URL | オプション（未設定時はインメモリフォールバック） |
| 環境変数 SUPABASE_ANON_KEY | オプション |

## セットアップ手順

```bash
npm install
cp .env.example .env
# 最低限 GEMINI_API_KEY を設定
# Supabase を使う場合は SUPABASE_URL と SUPABASE_ANON_KEY も設定
npm run dev
```

## curl コマンド例

### ドキュメント検索 + 計算

```bash
curl -X POST http://localhost:3000/node/agent/rag-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "プロジェクト X の予算から使用済み分を引いた残予算を計算してください"}'
```

### ドキュメント検索のみ

```bash
curl -X POST http://localhost:3000/node/agent/rag-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "有給休暇のポリシーを検索してください"}'
```

### 現在日時 + ドキュメント検索

```bash
curl -X POST http://localhost:3000/node/agent/rag-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "今日の日付とプロジェクト X の締め切りを確認してください"}'
```

## レスポンス例

```json
{
  "reply": "プロジェクト X の総予算 5,000,000 円から使用済み 2,300,000 円を引いた残予算は 2,700,000 円です。",
  "toolCalls": [
    { "name": "search_documents", "args": { "query": "プロジェクト X 予算" }, "result": "..." },
    { "name": "calculate",        "args": { "expression": "5000000 - 2300000" }, "result": "2700000" }
  ]
}
```

## インメモリドキュメント一覧（Supabase 未設定時）

| 出典 | 内容 |
|------|------|
| project-x.txt | プロジェクト X の予算・スケジュール情報 |
| budget-report.txt | 使用済み予算レポート |
| hr-policy.txt | 有給・勤怠ポリシー |

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| "関連ドキュメントが見つかりません" | 未登録キーワード | インメモリドキュメントの内容を確認 |
| 400 Bad Request | message なし | リクエストを確認 |
| 503 | Gemini/Supabase 障害 | リトライまたは Supabase 接続を確認 |
