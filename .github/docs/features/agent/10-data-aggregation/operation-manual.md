# 運用マニュアル - データ集計エージェント

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | 必須 |
| データソース | インメモリダミーデータ（2025-01〜2025-02 の売上データ） |

## セットアップ手順

```bash
npm install
cp .env.example .env
# GEMINI_API_KEY を設定
npm run dev
```

## curl コマンド例

### 月次レポート生成

```bash
curl -X POST http://localhost:3000/node/agent/data-aggregation/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "2025 年 1 月の売上と在庫のレポートを作成してください"}'
```

### 売上のみ確認

```bash
curl -X POST http://localhost:3000/node/agent/data-aggregation/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "2025-02 の売上合計を教えてください"}'
```

### 在庫状況確認

```bash
curl -X POST http://localhost:3000/node/agent/data-aggregation/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "現在の在庫状況を確認してください"}'
```

## レスポンス例

```json
{
  "reply": "2025年1月の月次レポートを作成しました。\n合計売上: 1,250,000円（前月比+5%）\n...",
  "toolCalls": [
    { "name": "get_sales",       "args": { "period": "2025-01" }, "result": "..." },
    { "name": "get_inventory",   "args": {},                      "result": "..." },
    { "name": "generate_report", "args": { "salesData": "...", "inventoryData": "..." }, "result": "..." }
  ]
}
```

## 利用可能なダミーデータ期間

| 期間 | 売上合計 | 前月比 |
|------|---------|--------|
| 2025-01 | 1,250,000 円 | +5% |
| 2025-02 | 980,000 円 | -22% |

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| "売上データなし" | 未登録の期間 | 2025-01 または 2025-02 を使用 |
| 400 Bad Request | message なし | リクエストを確認 |
| 503 | Gemini 障害 | リトライ |
