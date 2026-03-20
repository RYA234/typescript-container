# 運用マニュアル - 天気・計算・時刻エージェント

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | Gemini API キー（必須） |
| PORT | デフォルト 3000 |

## セットアップ手順

```bash
# 1. リポジトリクローン後、依存関係インストール
npm install

# 2. 環境変数設定
cp .env.example .env
# .env の GEMINI_API_KEY を設定

# 3. 開発サーバー起動
npm run dev
```

## curl コマンド例

### 天気を聞く

```bash
curl -X POST http://localhost:3000/node/agent/basic/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "東京の天気を教えてください"}'
```

### 計算を依頼する

```bash
curl -X POST http://localhost:3000/node/agent/basic/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "123 × 456 を計算してください"}'
```

### 現在時刻を聞く

```bash
curl -X POST http://localhost:3000/node/agent/basic/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "今の時刻を教えてください"}'
```

### ヘルスチェック

```bash
curl http://localhost:3000/node/agent/basic/health
```

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| 400 Bad Request | message フィールドなし | リクエストボディに message を含める |
| 500 API key not configured | GEMINI_API_KEY 未設定 | .env ファイルを確認 |
| 504 Gateway Timeout | Gemini API 応答なし | しばらく待ってリトライ |
| "計算エラー" が返る | 不正な数式 | 正しい算術式を入力 |

## レスポンス例

```json
{
  "reply": "東京の天気は晴れで、気温は 22°C です。",
  "toolCalls": [
    {
      "name": "get_weather",
      "args": { "city": "東京" },
      "result": "晴れ, 22°C"
    }
  ]
}
```
