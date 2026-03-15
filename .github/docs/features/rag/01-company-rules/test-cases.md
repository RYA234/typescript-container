# RAG #01 就業規則Q&A - テスト仕様書

## 文書情報
- 作成日: 2026-03-13
- ステータス: 📝 未着手

---

## 1. テストケース一覧

| No | テストID | テスト内容 | 入力 | 期待結果 | 優先度 |
|----|---------|-----------|------|---------|-------|
| 1 | TC-01-001 | txtテキストの登録（正常系） | text: 就業規則全文(500文字) | chunkCount >= 1, success: true | 高 |
| 2 | TC-01-002 | チャンク分割の確認 | text: 1500文字以上のテキスト | chunkCount >= 2 | 高 |
| 3 | TC-01-003 | ベクトル類似検索 | q: "有給休暇" | results[0].similarity >= 0.7 | 高 |
| 4 | TC-01-004 | RAGクエリ（質問応答） | question: "有給は何日取れますか？" | answer に日数が含まれる | 高 |
| 5 | TC-01-005 | sourceパラメータ省略 | text: テキスト, source省略 | success: true, metadata.source == "unknown" | 中 |
| 6 | TC-01-006 | sourceパラメータ付き登録 | text: テキスト, source: "就業規則2024" | metadata.source == "就業規則2024" | 中 |
| 7 | TC-01-007 | limit指定の検索 | q: "休暇", limit: 5 | results.length <= 5 | 中 |
| 8 | TC-01-008 | 全削除API | DELETE /node/rag/documents | deletedCount >= 0, success: true | 高 |
| 9 | TC-01-009 | 削除後に検索 | 全削除後にsearch | results.length == 0 | 中 |
| 10 | TC-01-010 | executionTimeMsの確認 | POST /node/rag/ingest | executionTimeMs が数値 | 低 |

---

## 2. 境界値テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | BV-01-001 | 最小テキスト（1文字） | text: "あ" | chunkCount == 1 |
| 2 | BV-01-002 | 最大limit値 | limit: 10 | results.length <= 10 |
| 3 | BV-01-003 | limit=0 | limit: 0 | 400 または results.length == 0 |
| 4 | BV-01-004 | 非常に長いテキスト（10,000文字） | 10000文字のtext | chunkCount >= 5 |
| 5 | BV-01-005 | 日本語・英語混在テキスト | text: "Annual Leave 年次有給休暇" | success: true |

---

## 3. 異常系テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | ERR-01-001 | textパラメータなし | POST /ingest (body空) | 400 Bad Request |
| 2 | ERR-01-002 | 空文字列のtext | text: "" | 400 Bad Request |
| 3 | ERR-01-003 | questionパラメータなし | POST /query (body空) | 400 Bad Request |
| 4 | ERR-01-004 | qパラメータなし | GET /search | 400 Bad Request |
| 5 | ERR-01-005 | ドキュメント未登録時のquery | 全削除後にPOST /query | 400 または answer に「情報なし」相当 |
| 6 | ERR-01-006 | limit超過値 | limit: 11 | 400 Bad Request または limit=10で処理 |
| 7 | ERR-01-007 | Content-Typeなし | POST /ingest (Content-Type省略) | 400 Bad Request |
