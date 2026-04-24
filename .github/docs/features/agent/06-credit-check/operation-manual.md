# 運用マニュアル - 与信チェックエージェント

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | 必須 |
| データソース | インメモリダミーデータ（DB 不要） |

## セットアップ手順

```bash
npm install
cp .env.example .env
# GEMINI_API_KEY を設定
npm run dev
```

## curl コマンド例

### 与信チェック実行

```bash
curl -X POST http://localhost:3000/node/agent/credit-check/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "株式会社サンプルの与信チェックをお願いします"}'
```

### 高スコア企業

```bash
curl -X POST http://localhost:3000/node/agent/credit-check/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "テスト商事株式会社の与信審査をしてください"}'
```

### 無効な会社名

```bash
curl -X POST http://localhost:3000/node/agent/credit-check/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "架空企業の与信チェックをして"}'
```

## レスポンス例

```json
{
  "reply": "株式会社サンプルの与信審査結果：バリデーション OK、スコア 75 点、判定は「承認」です。",
  "toolCalls": [
    { "name": "validate_company", "args": { "companyName": "株式会社サンプル" }, "result": "valid" },
    { "name": "score_credit",     "args": { "companyName": "株式会社サンプル" }, "result": "75" },
    { "name": "judge_credit",     "args": { "score": 75 }, "result": "承認" }
  ]
}
```

## 判定基準

| スコア | 判定 |
|--------|------|
| 80〜100 | 優良承認 |
| 60〜79 | 承認 |
| 40〜59 | 条件付き承認 |
| 0〜39 | 否認 |

## テスト用会社名

| 会社名 | スコア | 判定 |
|--------|--------|------|
| 株式会社サンプル | 75 | 承認 |
| テスト商事株式会社 | 85 | 優良承認 |
| 有限会社デモ | 55 | 条件付き承認 |
| 株式会社不審 | 30 | 否認 |
| 架空企業 | - | invalid |

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| "invalid: 存在しない会社" | 未登録企業 | テスト用会社名を使用 |
| 400 Bad Request | message なし | リクエストを確認 |
| 503 | Gemini 障害 | リトライ |
