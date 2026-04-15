import { test, expect } from '@playwright/test';

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
