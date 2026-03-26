# RAG #06 複数ドキュメント横断検索 - テスト仕様書

## 文書情報
- 作成日: 2026-03-13
- ステータス: 📝 未着手

---

## 1. テストケース一覧

| No | テストID | テスト内容 | 入力 | 期待結果 | 優先度 |
|----|---------|-----------|------|---------|-------|
| 1 | TC-06-001 | 複数document_typeで登録 | source: "manual", "policy", "faq" 各1件 | 全件success: true | 高 |
| 2 | TC-06-002 | 横断検索（document_type指定なし） | q: "申請手続き" | 全document_typeから結果が返る | 高 |
| 3 | TC-06-003 | document_type別フィルタ検索 | q: "申請", document_type: "manual" | manual のみ結果が返る | 高 |
| 4 | TC-06-004 | 別document_typeに同内容登録時の横断 | 同内容を2種類のtypeで登録 | 両方のtypeから結果が返る | 中 |
| 5 | TC-06-005 | RAQクエリで複数ソースから回答 | question: 複数ドキュメントにまたがる質問 | sources に複数document_typeが含まれる | 高 |
| 6 | TC-06-006 | metadataのdocument_type保存確認 | source: "specification" | metadata.source == "specification" | 中 |
| 7 | TC-06-007 | 存在しないdocument_typeで検索 | document_type: "nonexistent" | results.length == 0 | 中 |
| 8 | TC-06-008 | 検索結果のスコアによる並び順 | 複数ドキュメント検索 | similarity降順で返る | 高 |

---

## 2. 境界値テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | BV-06-001 | document_typeが1種類のみ | 1種類のみ登録してクエリ | そのtypeの結果のみ返る |
| 2 | BV-06-002 | 5種類のdocument_typeで横断検索 | 5種類登録後にクエリ | 全5種類から検索 |
| 3 | BV-06-003 | 同一document_typeに100件 | 100件同一type登録 | 正常登録・検索可能 |

---

## 3. 異常系テスト

| No | テストID | テスト内容 | 入力 | 期待結果 |
|----|---------|-----------|------|---------|
| 1 | ERR-06-001 | ドキュメント未登録での横断検索 | 全削除後にsearch | results.length == 0 |
| 2 | ERR-06-002 | qなしで横断検索 | GET /search | 400 Bad Request |
| 3 | ERR-06-003 | 不正なdocument_type値（数値） | document_type: 12345 | 400 Bad Request または文字列変換 |
