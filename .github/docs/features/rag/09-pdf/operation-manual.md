# RAG #09 PDFドキュメント取り込み - 操作手順書

## 前提条件
- `.env` に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` が設定済み
- Supabaseに `documents` テーブルと `match_documents` 関数が作成済み
- PDF解析ライブラリ（pdf-parse など）がインストール済み
- サーバーが起動済み（`npm run dev`）

---

## Step 1: Supabase セットアップ

`supabase-setup.md` の手順でテーブルと関数を作成する。

---

## Step 2: テスト用PDFの準備

テスト用PDFを用意する。サンプル作成コマンド（Node.jsで生成する場合）:

```bash
# サンプルのテキストPDFを準備
# 手動でPDFを用意するか、既存のマニュアルPDFを使用する
ls ./test-data/*.pdf
```

---

## Step 3: PDFファイルのアップロード・取り込み

```bash
curl -X POST http://localhost:3000/node/rag/pdf/upload \
  -F "file=@./sample-manual.pdf" \
  -F "source=pdf-manual"
```

期待レスポンス:
```json
{
  "success": true,
  "filename": "sample-manual.pdf",
  "pageCount": 5,
  "extractedTextLength": 3500,
  "chunkCount": 8,
  "executionTimeMs": 2500
}
```

---

## Step 4: テキスト抽出の確認

```bash
# 取り込んだPDFのキーワードで検索
curl "http://localhost:3000/node/rag/search?q=PDF内のキーワード&limit=3"
```

---

## Step 5: PDFに基づくRAQクエリ

```bash
curl -X POST http://localhost:3000/node/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "PDFマニュアルの第2章の内容を教えてください"}'
```

レスポンスの `sources` に `metadata.filename: "sample-manual.pdf"` が含まれることを確認する。

---

## Step 6: データ削除（クリーンアップ）

```bash
curl -X DELETE http://localhost:3000/node/rag/documents
```

---

## よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|-------|
| 400 INVALID_FILE_TYPE | PDF以外のファイル | .pdfファイルを指定 |
| 400 EMPTY_PDF | テキストなしPDF（スキャン画像） | テキストレイヤー付きPDFを使用 |
| 413 Payload Too Large | ファイルサイズ超過 | ファイルサイズを小さくする |
| extractedText が空 | 画像PDFまたは暗号化PDF | テキスト付きPDFを使用 |
| 502 GEMINI_ERROR | Gemini API接続失敗 | GEMINI_API_KEY を確認 |

## アップロード形式

- Content-Type: `multipart/form-data`
- フィールド名: `file`（実装に合わせて変更）
- 対応形式: `.pdf`
- 推奨サイズ: 10MB以下
