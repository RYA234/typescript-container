# RAG #09 PDFドキュメント取り込み - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#61](https://github.com/RYA234/typescript-container/issues/61)
- **ソース**: `src/rag/pdf/`

---

## 環境制約（本番ガード）

`router.ts` で `NODE_ENV === 'production'` の場合、書き込み系エンドポイントを登録しない。

```typescript
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  router.post('/ingest', controller.ingest);
  router.delete('/documents', controller.deleteAll); // 実装する場合
}
// 検索系は本番でも有効
router.get('/search', rateLimiter, controller.search);
router.post('/query', rateLimiter, controller.query);
```

---

## 1. 依存パッケージ

```bash
npm install pdf-parse multer @types/multer
```

---

## 2. DDL

```sql
CREATE TABLE IF NOT EXISTS pdf_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    page_count INTEGER,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pdf_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdf_id UUID REFERENCES pdf_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INTEGER,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pdf_chunks_embedding_idx
ON pdf_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_pdf_chunks(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID, content TEXT, page_number INTEGER,
    pdf_title TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT c.id, c.content, c.page_number, d.title AS pdf_title,
           1 - (c.embedding <=> query_embedding) AS similarity
    FROM pdf_chunks c
    JOIN pdf_documents d ON c.pdf_id = d.id
    WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 3. 型定義

```typescript
export interface PdfUploadResponse {
  success: boolean;
  title: string;
  pageCount: number;
  chunkCount: number;
  executionTimeMs: number;
}

export interface PdfQueryResponse {
  answer: string;
  sources: Array<{
    title: string;
    page: number;
    content: string;
    similarity: number;
  }>;
  executionTimeMs: number;
}
```

---

## 4. サービス実装詳細

### uploadPdf

```typescript
async uploadPdf(buffer: Buffer, title: string, fileName: string): Promise<PdfUploadResponse> {
  const start = Date.now();

  // PDFテキスト抽出
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;
  const pageCount = pdfData.numpages;

  // pdfドキュメントレコード作成
  const { data: doc } = await supabase
    .from('pdf_documents')
    .insert({ title, file_name: fileName, page_count: pageCount })
    .select()
    .single();

  // チャンク分割・ベクトル化
  const chunks = this.chunkText(text, 500, 50);
  for (const chunk of chunks) {
    const embedding = await this.generateEmbedding(chunk);
    await supabase.from('pdf_chunks').insert({
      pdf_id: doc.id,
      content: chunk,
      embedding
    });
  }

  return { success: true, title, pageCount, chunkCount: chunks.length, executionTimeMs: Date.now() - start };
}
```

**注意**: `pdf-parse`はテキストベースPDFのみ対応。スキャンPDF（画像PDF）は別途OCRが必要。

---

## 5. multerミドルウェア設定

```typescript
import multer from 'multer';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('PDFファイルのみ許可されています'));
  }
});
```

---

## 6. テスト方針

```typescript
describe('PdfService', () => {
  it('PDFバッファからテキストを抽出できる');
  it('チャンク分割してSupabaseに登録できる');
  it('PDF内容で検索できる');
  it('PDF以外のファイルは400エラー');
});
```
