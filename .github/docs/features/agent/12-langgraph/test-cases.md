# テストケース - LangGraphエージェント

## 正常系

| # | 入力 message | 期待 messageType | 期待 graphPath |
|---|-------------|----------------|---------------|
| 1 | 「東京の人口は？」 | search | START → classify → search → answer → END |
| 2 | 「100 × 50 を計算して」 | calculate | START → classify → calculate → answer → END |
| 3 | 「こんにちは」 | answer | START → classify → answer → END |
| 4 | 「大阪の人口を検索して計算も」 | search | search → answer パス |

## 境界値

| # | 入力 | 期待動作 |
|---|------|---------|
| 5 | 1 文字 "a" | answer パスで直接回答 |
| 6 | 非常に長いメッセージ（1000 文字） | 正常処理 |
| 7 | 検索キーワードが複数含まれる | 最初のキーワードで検索 |

## 異常系

| # | 入力 | 期待 HTTP ステータス |
|---|------|-------------------|
| 8 | message なし | 400 |
| 9 | Gemini API 障害（classify） | 503 |
| 10 | Gemini API 障害（answer） | 503 |

## ユニットテスト: classifyNode

| # | message | 期待 messageType |
|---|---------|----------------|
| 11 | "東京の人口を検索して" | "search" |
| 12 | "123 + 456 を計算" | "calculate" |
| 13 | "ありがとう" | "answer" |

## ユニットテスト: routeByType

| # | state.messageType | 期待ルーティング先 |
|---|------------------|----------------|
| 14 | "search" | "search" ノード |
| 15 | "calculate" | "calculate" ノード |
| 16 | "answer" | "answer" ノード |
| 17 | undefined | "answer" ノード（デフォルト） |

## graphPath 確認

| # | シナリオ | 期待 graphPath |
|---|---------|---------------|
| 18 | 検索フロー | ["START", "classify", "search", "answer", "END"] |
| 19 | 計算フロー | ["START", "classify", "calculate", "answer", "END"] |
| 20 | 直接回答フロー | ["START", "classify", "answer", "END"] |
