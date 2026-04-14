import { test, expect } from '@playwright/test';

test.describe('RAG product-catalog API', () => {
  test('GET /search - q未指定で400を返す', async ({ request }) => {
    const res = await request.get('/node/rag/product/search');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });

  test('GET /search - q未指定の場合はlimitがあっても400を返す', async ({ request }) => {
    const res = await request.get('/node/rag/product/search?limit=abc');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });
});
