# RAG #02 商品カタログ検索 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: 📝 未着手
- **Issue**: [#54](https://github.com/RYA234/typescript-container/issues/54)
- **ソース**: `src/rag/product/`

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

## 1. ディレクトリ構成

```
src/rag/product/
├── router.ts
├── controller.ts
├── service.ts
└── tests/
    └── product.test.ts
```

---

## 2. DDL

```sql
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER,
    category TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_embedding_idx
ON products USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_products(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID, name TEXT, description TEXT,
    price INTEGER, category TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, name, description, price, category,
           1 - (embedding <=> query_embedding) AS similarity
    FROM products
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

## 3. 型定義

```typescript
export interface Product {
  name: string;
  description: string;
  price?: number;
  category?: string;
}

export interface ProductIngestRequest {
  products: Product[];
}

export interface ProductIngestResponse {
  success: boolean;
  registeredCount: number;
  executionTimeMs: number;
}

export interface ProductSearchResult extends Product {
  id: string;
  similarity: number;
}

export interface ProductSearchResponse {
  results: ProductSearchResult[];
  executionTimeMs: number;
}
```

---

## 4. サービス実装詳細

### ingestProducts

```typescript
async ingestProducts(products: Product[]): Promise<ProductIngestResponse> {
  const start = Date.now();
  for (const product of products) {
    // 商品名 + 説明を結合してベクトル化
    const text = `${product.name} ${product.description}`;
    const embedding = await this.generateEmbedding(text);
    await supabase.from('products').insert({ ...product, embedding });
  }
  return { success: true, registeredCount: products.length, executionTimeMs: Date.now() - start };
}
```

### searchProducts

```typescript
async searchProducts(query: string, limit = 3): Promise<ProductSearchResponse> {
  const start = Date.now();
  const embedding = await this.generateEmbedding(query);
  const { data } = await supabase.rpc('match_products', {
    query_embedding: embedding,
    match_count: limit
  });
  return { results: data, executionTimeMs: Date.now() - start };
}
```

---

## 5. テスト方針

```typescript
describe('ProductService', () => {
  it('ingestProducts: 商品データを登録できる');
  it('searchProducts: 類似商品を返す');
  it('searchProducts: 商品未登録の場合は空配列');
});
```
