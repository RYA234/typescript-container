# テストケース - 自律リサーチエージェント

## 正常系

| # | 入力 message | maxIterations | 期待 iterations | 期待する応答の要素 |
|---|-------------|--------------|----------------|----------------|
| 1 | 「TypeScript の最新バージョンを調査して」 | 5 | 1〜3 | TypeScript バージョン情報 |
| 2 | 「Node.js について調査して」 | 3 | 1〜3 | Node.js 情報 |
| 3 | 「1 回だけ検索して結果をまとめて」 | 1 | 1 | 検索結果 |

## 境界値

| # | 入力 | maxIterations | 期待動作 |
|---|------|--------------|---------|
| 4 | 検索結果なしのクエリ | 3 | 1 イテレーションで done になる |
| 5 | 任意のクエリ | 5 | 最大 5 回で打ち切り |
| 6 | maxIterations = 1 | 1 | 1 回実行して終了 |
| 7 | maxIterations = 0 | 0 | 0 回実行、空のレスポンス |

## 異常系

| # | 入力 | 期待 HTTP ステータス |
|---|------|-------------------|
| 8 | message なし | 400 |
| 9 | maxIterations が負数 | 400 |
| 10 | Gemini API 障害 | 503 |

## ユニットテスト: searchWeb

| # | query | 期待結果 |
|---|-------|---------|
| 11 | "TypeScript 最新バージョン" | "TypeScript 5.3" を含む |
| 12 | "TypeScript 5.3 新機能" | "Import Attributes" を含む |
| 13 | "全くマッチしないクエリ" | "検索結果なし" |

## ユニットテスト: ループ制御

| # | シナリオ | 期待 iterations |
|---|---------|----------------|
| 14 | decide_next が常に "done" を返す | 1 |
| 15 | decide_next が常に "continue" を返す | maxIterations |
| 16 | 3 回目で "done" を返す | 3 |

## searchHistory 確認

| # | シナリオ | 期待 searchHistory |
|---|---------|------------------|
| 17 | 2 イテレーション | searchHistory.length === 2 |
| 18 | 各エントリ | query, rawResult, summary すべて存在 |
