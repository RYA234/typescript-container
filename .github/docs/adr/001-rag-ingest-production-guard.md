# ADR-001: RAGデータ登録APIの本番環境ガード

## ステータス
採用済み

## 日付
2026-03-20

## コンテキスト

RAG機能はSupabaseにベクトルデータを登録するingest APIと、登録済みデータを検索するsearch/query APIで構成される。

- ingest APIは本番環境でも公開すると、外部から任意のデータをSupabaseに書き込まれるリスクがある
- 本サービスはポートフォリオ用途であり、データ登録は開発者自身が手動またはシードスクリプトで行えば十分
- 本番環境でingest/deleteが有効だと、誤操作・不正アクセスによるデータ破壊・汚染が発生しうる

## 決定

`router.ts` で `NODE_ENV === 'production'` の場合、データ書き込み系エンドポイント（POST /ingest・DELETE /documents）をルートに登録しない。

```typescript
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  router.post('/ingest', controller.ingest);
  router.delete('/documents', controller.deleteAll);
}
// 検索系は本番でも有効
router.get('/search', rateLimiter, controller.search);
router.post('/query', rateLimiter, controller.query);
```

本番データの初期投入はデプロイ時にシードスクリプトを手動実行する。

## 理由

### 採用理由
- 実装コストが最小（条件分岐1つで完結）
- 本番環境でのデータ書き込みを完全に遮断できる
- 検索・参照はそのまま公開でき、ポートフォリオとしてのデモ用途を損なわない

### 代替案との比較

| 案 | セキュリティ | 実装コスト | デメリット |
|---|---|---|---|
| **本番ルート未登録（採用）** | **高** | **低** | シードスクリプトが必要 |
| 認証トークンで保護 | 高 | 中 | トークン管理が必要 |
| 本番でも開放 | 低 | なし | 外部からの不正書き込みリスク |

## 結果

### ポジティブな影響
- 本番環境での不正・誤操作によるデータ汚染を防止
- ルートが存在しないため404となり、攻撃面を最小化できる

### ネガティブな影響
- 本番データの更新にはシードスクリプトの手動実行が必要
- 開発環境と本番環境でAPIの挙動が異なるため、動作確認は開発環境で行う必要がある

## 関連
- [RAG設計書 02〜15](./../features/rag/)
- [就業規則Q&A実装（#53）](https://github.com/RYA234/typescript-container/issues/53)
