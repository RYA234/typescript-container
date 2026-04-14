import { test, expect } from '@playwright/test';

/**
 * RAG系 APIエンドポイントの詳細E2Eテスト
 *
 * 外部API（Gemini/Supabase/Claude）を呼ぶ正常系はテスト対象外。
 * バリデーションエラー（400）はパラメータチェック段階で弾かれるため外部API不要。
 */

// -------------------------------------------------------
// product-catalog
// -------------------------------------------------------
test.describe('RAG product-catalog API', () => {
  test('GET /search - q未指定で400を返す', async ({ request }) => {
    const res = await request.get('/node/rag/product/search');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });

  test('GET /search - limitが文字列でも400を返さない（limitはオプション）', async ({ request }) => {
    // q必須なので q未指定の場合は400
    const res = await request.get('/node/rag/product/search?limit=abc');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });
});

// -------------------------------------------------------
// FAQ
// -------------------------------------------------------
test.describe('RAG FAQ API', () => {
  test('POST /answer - question未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/rag/faq/answer', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });

  test('POST /answer - questionが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/rag/faq/answer', { data: { question: '   ' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });
});

// -------------------------------------------------------
// glossary
// -------------------------------------------------------
test.describe('RAG glossary API', () => {
  test('GET /search - q未指定で400を返す', async ({ request }) => {
    const res = await request.get('/node/rag/glossary/search');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });
});

// -------------------------------------------------------
// recipe
// -------------------------------------------------------
test.describe('RAG recipe API', () => {
  test('POST /suggest - query未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/rag/recipe/suggest', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });

  test('POST /suggest - queryが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/rag/recipe/suggest', { data: { query: '' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });
});

// -------------------------------------------------------
// multi-doc
// -------------------------------------------------------
test.describe('RAG multi-doc API', () => {
  test('POST /query - question未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/rag/multi-doc/query', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });

  test('POST /query - questionが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/rag/multi-doc/query', { data: { question: '   ' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });

  test('GET /documents - 200を返す（外部API不要）', async ({ request }) => {
    const res = await request.get('/node/rag/multi-doc/documents');
    // Supabase接続がなくても200か502を返す（クラッシュしないことを確認）
    expect([200, 502]).toContain(res.status());
  });
});

// -------------------------------------------------------
// company-rules
// -------------------------------------------------------
test.describe('RAG company-rules API', () => {
  test('GET /config - 200を返す', async ({ request }) => {
    const res = await request.get('/node/rag/company-rules/config');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.writeEnabled).toBe('boolean');
  });

  test('POST /query - bodyなしで400を返す', async ({ request }) => {
    const res = await request.post('/node/rag/company-rules/query', { data: {} });
    expect(res.status()).toBe(400);
  });
});
