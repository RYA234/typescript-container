# ADR-003: LangChain vs Google AI SDK の使い分け方針

## ステータス
採用済み

## 日付
2026-03-20

## コンテキスト

本プロジェクトではGemini APIを呼び出す手段として以下の2つが混在している。

- **LangChain** (`@langchain/google-genai`): チェーン・メモリ・ドキュメントローダーなどの高レベル抽象を提供するフレームワーク
- **Google AI SDK** (`@google/generative-ai`): Gemini APIを直接呼び出すオフィシャルSDK

初期実装（#53 就業規則Q&A）ではLangChainのRAGチェーンを採用したが、その後の実装（#54 商品カタログ・#68 エージェント）ではGoogle AI SDKを直接使用している。使い分けの方針が暗黙的になっていたため、明文化する。

## 決定

以下の方針で使い分ける。

| 使用技術 | 適用する場面 |
|---|---|
| **Google AI SDK** | embedding生成・シンプルなFunction Calling・単発のgenerateContent |
| **LangChain** | RAGチェーン（検索→生成のパイプライン）・会話メモリ管理・複数ステップの処理連鎖 |
| **LangGraph** | 分岐・ループを含む複雑なエージェントワークフロー・マルチエージェント協調 |

### 判断基準

```
処理が1〜2ステップで完結する
  → Google AI SDK 直叩き

チェーン処理・メモリ・ドキュメントローダーが必要
  → LangChain

分岐・ループ・マルチエージェントが必要
  → LangGraph
```

## 理由

### Google AI SDK を優先する理由
- 依存が軽量でTypeScriptの型が明確
- シンプルな処理にLangChainを使うと抽象レイヤーが増えてデバッグしにくい
- Gemini固有の機能（Function Calling・embeddingの次元指定）をそのまま使える

### LangChainを使う理由
- RAGパイプライン（テキスト分割→embedding→ベクトルDB→検索→プロンプト生成→LLM）をチェーンで簡潔に記述できる
- 会話履歴・メモリ管理の抽象が充実している
- ドキュメントローダー（PDF・Web・テキスト）が豊富

### LangGraphを使う理由（今後）
- ノード・エッジで処理フローを宣言的に定義できる
- 条件分岐・ループ・並列実行が可能
- マルチエージェント間の状態共有に対応

## 結果

### ポジティブな影響
- 新規実装時に「どちらを使うか」で迷わない
- シンプルな処理にLangChainを使いすぎて複雑になるのを防げる

### ネガティブな影響
- 現状のcodebaseでLangChainとSDK直叩きが混在しており、統一されていない
- リファクタリングで統一する場合はコストがかかる（優先度低）

## 関連
- [#53 就業規則Q&A（LangChain使用）](https://github.com/RYA234/typescript-container/issues/53)
- [#54 商品カタログ（Google AI SDK使用）](https://github.com/RYA234/typescript-container/issues/54)
- [#68 天気・計算・時刻エージェント（Google AI SDK使用）](https://github.com/RYA234/typescript-container/issues/68)
- [#79 LangGraphエージェント（今後実装予定）](https://github.com/RYA234/typescript-container/issues/79)
