# 運用マニュアル - 問い合わせ振り分けエージェント

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | 必須 |
| チケットデータ | インメモリ（再起動でリセット） |

## セットアップ手順

```bash
npm install
cp .env.example .env
# GEMINI_API_KEY を設定
npm run dev
```

## curl コマンド例

### 配送問題の問い合わせ

```bash
curl -X POST http://localhost:3000/node/agent/inquiry-routing/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "注文した商品が 1 週間経っても届きません。注文番号は ORD-123 です。"}'
```

### 技術サポートの問い合わせ

```bash
curl -X POST http://localhost:3000/node/agent/inquiry-routing/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "ログインしようとするとエラーが表示されます。「認証エラー 401」と出ます。"}'
```

### 請求に関する問い合わせ

```bash
curl -X POST http://localhost:3000/node/agent/inquiry-routing/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "先月の請求金額が明細と合っていません。返金を希望します。"}'
```

## レスポンス例

```json
{
  "reply": "配送問題として物流部門に転送し、チケット TKT-001 を作成しました。担当者から連絡いたします。",
  "toolCalls": [
    { "name": "analyze_inquiry", "args": { "text": "..." }, "result": "配送問題" },
    { "name": "get_department",  "args": { "category": "配送問題" }, "result": "物流部門" },
    { "name": "create_ticket",   "args": { "content": "...", "department": "物流部門" }, "result": "TKT-001" }
  ]
}
```

## カテゴリ判定キーワード

| カテゴリ | キーワード例 |
|---------|------------|
| 配送問題 | 届かない・配送・発送・遅延 |
| 商品不良 | 壊れ・不良・欠陥・破損 |
| 請求・支払い | 請求・支払・返金・領収書 |
| 技術サポート | エラー・動かない・バグ・不具合 |
| 一般問い合わせ | 上記以外すべて |

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| 400 Bad Request | message なし | リクエストを確認 |
| 503 | Gemini 障害 | リトライ |
