# テストケース - マルチエージェント

## 正常系

| # | 入力 message | 期待エージェント呼び出し | 期待する応答の要素 |
|---|-------------|----------------------|----------------|
| 1 | 「TypeScript と Python の比較レポート」 | Orchestrator + Research × 2 + Summary | 両言語の比較内容 |
| 2 | 「Node.js についてまとめて」 | Orchestrator + Research + Summary | Node.js 情報 |
| 3 | 「AI と機械学習の違いを調べて」 | Orchestrator + Research × 2 + Summary | 両用語の説明 |

## 境界値

| # | 入力 | 期待動作 |
|---|------|---------|
| 4 | タスク分解が 1 件のみ | ResearchAgent 1 回 + SummaryAgent |
| 5 | タスク分解が 4 件 | ResearchAgent 3 回 + SummaryAgent |
| 6 | 検索 DB にヒットしないトピック | "情報なし" をもとに回答 |

## 異常系

| # | 入力 | 期待 HTTP ステータス |
|---|------|-------------------|
| 7 | message なし | 400 |
| 8 | Gemini API 障害（Orchestrator） | 503 |
| 9 | Gemini API 障害（SummaryAgent） | 503 |

## ユニットテスト: OrchestratorAgent

| # | message | 期待タスク数 |
|---|---------|-----------|
| 10 | 「TypeScript と Python の比較」 | 2〜4 件 |
| 11 | 「Node.js まとめ」 | 2〜3 件 |

## ユニットテスト: ResearchAgent

| # | topic | 期待結果 |
|---|-------|---------|
| 12 | "TypeScript" | TypeScript 情報を含む |
| 13 | "Python" | Python 情報を含む |
| 14 | "全くマッチしないトピック" | "情報なし" ベースの回答 |

## agentLog 確認

| # | シナリオ | 期待 agentLog |
|---|---------|-------------|
| 15 | 正常実行 | Orchestrator → ResearchAgent × N → SummaryAgent の順 |
| 16 | 各エントリ | agent, action, result すべて存在 |
