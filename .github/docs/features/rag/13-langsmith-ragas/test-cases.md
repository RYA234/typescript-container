# RAG #13 LangSmith + Ragas評価 - テスト仕様書

## 文書情報
- 作成日: 2026-03-13
- ステータス: 📝 未着手

---

## 1. テストケース一覧

| No | テストID | テスト内容 | 入力 | 期待結果 | 優先度 |
|----|---------|-----------|------|---------|-------|
| 1 | TC-13-001 | 評価APIの呼び出し | question + answer + contexts | 評価スコアが返る | 高 |
| 2 | TC-13-002 | Faithfulness（忠実性）スコア確認 | 文脈に基づいた回答 | faithfulness: 0-1の数値 | 高 |
| 3 | TC-13-003 | Answer Relevancy（回答関連性）確認 | 質問に関連した回答 | answer_relevancy: 0-1の数値 | 高 |
| 4 | TC-13-004 | Context Precision（文脈精度）確認 | 適切な文脈を使った回答 | context_precision: 0-1の数値 | 高 |
| 5 | TC-13-005 | Context Recall（文脈再現率）確認 | 文脈を網羅した回答 | context_recall: 0-1の数値 | 高 |
| 6 | TC-13-006 | LangSmithへのトレース送信 | 評価実行後 | LangSmithダッシュボードにログが記録 | 中 |
| 7 | TC-13-007 | 低品質回答の評価 | 文脈と無関係な回答 | faithfulness が低い（< 0.5） | 中 |
| 8 | TC-13-008 | バッチ評価の実行 | 複数のQAペア | 各ペアに評価スコアが付く | 中 |

---

## 2. 境界値テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | BV-13-001 | 完璧な回答（文脈をそのまま返す） | context == answer | faithfulness == 1.0 に近い |
| 2 | BV-13-002 | 全く無関係な回答 | answer が context と無関係 | faithfulness が低い |
| 3 | BV-13-003 | 空の文脈 | contexts: [] | エラーまたは低スコア |
| 4 | BV-13-004 | 非常に長い文脈（5000文字） | 5000文字のcontext | 正常に評価される |

---

## 3. 異常系テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | ERR-13-001 | questionなし | body: { answer, contexts } | 400 Bad Request |
| 2 | ERR-13-002 | answerなし | body: { question, contexts } | 400 Bad Request |
| 3 | ERR-13-003 | LANGCHAIN_API_KEYが無効 | 無効なAPIキーで評価 | 502 LANGSMITH_ERROR |
| 4 | ERR-13-004 | Ragas評価ライブラリが未インストール | 依存関係なし状態 | 500 INTERNAL_ERROR |
