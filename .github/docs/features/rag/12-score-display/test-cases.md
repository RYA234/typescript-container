# RAG #12 根拠スコア表示 - テスト仕様書

## 文書情報
- 作成日: 2026-03-13
- ステータス: 📝 未着手

---

## 1. テストケース一覧

| No | テストID | テスト内容 | 入力 | 期待結果 | 優先度 |
|----|---------|-----------|------|---------|-------|
| 1 | TC-12-001 | 類似度スコアがレスポンスに含まれる | GET /search?q=... | results[].similarity が数値 | 高 |
| 2 | TC-12-002 | HIGH判定（similarity >= 0.8） | 高類似度のクエリ | confidence: "HIGH" | 高 |
| 3 | TC-12-003 | MEDIUM判定（0.6 <= similarity < 0.8） | 中類似度のクエリ | confidence: "MEDIUM" | 高 |
| 4 | TC-12-004 | LOW判定（0.5 <= similarity < 0.6） | 低類似度のクエリ | confidence: "LOW" | 高 |
| 5 | TC-12-005 | スコアによる並び順確認 | 複数件の検索結果 | similarity降順で返る | 高 |
| 6 | TC-12-006 | RAGクエリのsourcesにスコア付与 | POST /query | sources[].similarity が数値 | 高 |
| 7 | TC-12-007 | overall_confidenceの確認 | POST /query | overall_confidence: "HIGH/MEDIUM/LOW" | 中 |
| 8 | TC-12-008 | スコアの範囲確認 | 複数クエリ | 0.0 <= similarity <= 1.0 | 高 |

---

## 2. 境界値テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | BV-12-001 | similarity = 0.8ちょうど（HIGH境界） | HIGH/MEDIUMの境界クエリ | confidence: "HIGH" |
| 2 | BV-12-002 | similarity = 0.6ちょうど（MEDIUM境界） | MEDIUM/LOWの境界クエリ | confidence: "MEDIUM" |
| 3 | BV-12-003 | similarity = 0.5（閾値ちょうど） | 閾値ちょうどのクエリ | 結果に含まれる |
| 4 | BV-12-004 | similarity = 1.0（完全一致） | 登録テキストをそのまま検索 | confidence: "HIGH" |

---

## 3. 異常系テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | ERR-12-001 | ドキュメント未登録でスコア確認 | 全削除後にsearch | results.length == 0 |
| 2 | ERR-12-002 | qなしでスコア付き検索 | GET /search (qなし) | 400 Bad Request |
| 3 | ERR-12-003 | 無関係なクエリでスコアが閾値未満 | 全く無関係なキーワード | results.length == 0（閾値以下が除外） |
