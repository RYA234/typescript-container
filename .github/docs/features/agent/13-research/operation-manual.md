# 運用マニュアル - 自律リサーチエージェント

## 前提条件

| 項目 | 内容 |
|------|------|
| Node.js | v20 以上 |
| 環境変数 GEMINI_API_KEY | 必須 |
| 最大イテレーション | デフォルト 5 回（リクエストで上書き可） |

## セットアップ手順

```bash
npm install
cp .env.example .env
# GEMINI_API_KEY を設定
npm run dev
```

## curl コマンド例

### デフォルト設定でリサーチ

```bash
curl -X POST http://localhost:3000/node/agent/research/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "TypeScript の最新機能について調査してください"}'
```

### イテレーション数を指定

```bash
curl -X POST http://localhost:3000/node/agent/research/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Node.js のパフォーマンス最適化方法を調査して", "maxIterations": 3}'
```

### 1 回のみ検索

```bash
curl -X POST http://localhost:3000/node/agent/research/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Express.js のルーティングについて", "maxIterations": 1}'
```

## レスポンス例

```json
{
  "reply": "TypeScript 5.x のリサーチ結果をまとめました。TypeScript 5.3 では...",
  "iterations": 2,
  "searchHistory": [
    {
      "query": "TypeScript 最新バージョン",
      "rawResult": "TypeScript 5.3 が 2024 年にリリース...",
      "summary": "TypeScript 5.3 は Import Attributes をサポート"
    },
    {
      "query": "TypeScript 5.3 新機能",
      "rawResult": "Import Attributes、switch(true)...",
      "summary": "主要新機能 3 点を確認"
    }
  ]
}
```

## 検索可能なダミーキーワード

| キーワード | 内容 |
|-----------|------|
| TypeScript 最新バージョン | TypeScript 5.3 情報 |
| TypeScript 5.3 新機能 | Import Attributes など |
| TypeScript パフォーマンス | ビルド速度改善情報 |

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| 400 maxIterations が負数 | バリデーション | 1〜5 の範囲を指定 |
| 503 Gemini 障害 | API 障害 | リトライ |
| "検索結果なし" が続く | ダミーデータにないキーワード | 対応キーワードを使用 |

## コスト注意

- maxIterations を大きくすると Gemini API の呼び出し回数が増加します
- 本番環境では maxIterations の上限を 3〜5 に制限することを推奨
