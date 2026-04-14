import { test, expect } from '@playwright/test';

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

  test('GET /documents - クラッシュせず応答する', async ({ request }) => {
    const res = await request.get('/node/rag/multi-doc/documents');
    expect([200, 502]).toContain(res.status());
  });
});
