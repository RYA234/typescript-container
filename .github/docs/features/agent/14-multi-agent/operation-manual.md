# 運用マニュアル - マルチエージェント

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | 必須 |
| Gemini API 呼び出し回数 | 1 リクエストで 3〜6 回程度（コスト注意） |

## セットアップ手順

```bash
npm install
cp .env.example .env
# GEMINI_API_KEY を設定
npm run dev
```

## curl コマンド例

### 比較レポート生成

```bash
curl -X POST http://localhost:3000/node/agent/multi-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "TypeScript と Python の開発効率を比較したレポートを作成してください"}'
```

### 技術調査

```bash
curl -X POST http://localhost:3000/node/agent/multi-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Node.js のメリットとデメリットをまとめてください"}'
```

### ヘルスチェック

```bash
curl http://localhost:3000/node/agent/multi-agent/health
```

## レスポンス例

```json
{
  "reply": "TypeScript と Python の比較レポート：...",
  "agentLog": [
    { "agent": "Orchestrator", "action": "タスク分解", "result": ["TypeScript 調査", "Python 調査"] },
    { "agent": "ResearchAgent", "action": "TypeScript 調査", "result": "TypeScript は..." },
    { "agent": "ResearchAgent", "action": "Python 調査",   "result": "Python は..." },
    { "agent": "SummaryAgent",  "action": "まとめ",        "result": "最終レポートテキスト" }
  ]
}
```

## エージェント役割

| エージェント | 役割 |
|------------|------|
| OrchestratorAgent | タスクを 2〜4 個のサブタスクに分解 |
| ResearchAgent | 各サブタスクの情報収集 |
| SummaryAgent | 全収集結果のまとめ・レポート作成 |

## コスト注意

1 リクエストで Gemini API を複数回呼び出します（OrchestratorAgent 1 回 + ResearchAgent × N 回 + SummaryAgent 1 回）。レート制限に注意してください。

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| 400 Bad Request | message なし | リクエストを確認 |
| 503 | Gemini 障害 | リトライ |
| タイムアウト | エージェント連鎖に時間かかる | タイムアウト値を延長（60s 以上） |
