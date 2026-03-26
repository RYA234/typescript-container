# RAG #05 料理レシピ検索 - 内部設計書

## 文書情報
- **作成日**: 2026-03-13
- **ステータス**: ✅ 実装完了
- **Issue**: [#57](https://github.com/RYA234/typescript-container/issues/57)
- **ソース**: `src/rag/recipe/`

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
src/rag/recipe/
├── router.ts
├── controller.ts
├── service.ts
└── tests/
    └── recipe.test.ts
```

---

## 2. DDL

```sql
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ingredients JSONB NOT NULL DEFAULT '[]',
    time_minutes INTEGER,
    description TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ※ IVFFlat インデックスはデータが十分に増えてから追加する（lists数以上のレコードが必要）
-- 数百件以上になったら以下を実行:
-- CREATE INDEX recipes_embedding_idx ON recipes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

CREATE OR REPLACE FUNCTION match_recipes(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID, name TEXT, ingredients JSONB,
    time_minutes INTEGER, description TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT id, name, ingredients, time_minutes, description,
           1 - (embedding <=> query_embedding) AS similarity
    FROM recipes
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

> **注意**: IVFFlat インデックスの `lists` 数よりレコード数が少ないと全件スキップされる。
> デモ用途（数十〜百件規模）ではインデックスなしで十分。本番で万件超になったら追加すること。

---

## 3. 型定義

```typescript
export interface Recipe {
  name: string;
  ingredients: string[];
  timeMinutes?: number;
  description: string;
}

export interface RecipeSuggestRequest {
  query: string;
}

export interface RecipeSuggestResponse {
  suggestions: Array<Recipe & { similarity: number }>;
  executionTimeMs: number;
}
```

---

## 4. サービス実装詳細

### ingestRecipes

```typescript
async ingestRecipes(recipes: Recipe[]): Promise<void> {
  for (const recipe of recipes) {
    // 食材リストと説明をまとめてベクトル化
    const text = `${recipe.name} 食材:${recipe.ingredients.join(',')} ${recipe.description}`;
    const embedding = await this.generateEmbedding(text);
    await supabase.from('recipes').insert({
      name: recipe.name,
      ingredients: recipe.ingredients,
      time_minutes: recipe.timeMinutes,
      description: recipe.description,
      embedding
    });
  }
}
```

**ポイント**: 食材リストをカンマ区切りでテキストに含めることで、食材指定の検索精度を上げる。

---

## 5. テスト方針

```typescript
describe('RecipeService', () => {
  it('ingestRecipes: レシピを登録できる');
  it('suggestRecipes: 食材名で類似レシピを返す');
  it('suggestRecipes: 調理時間の条件でフィルタできる');
});
```
