import { test, expect } from '@playwright/test';

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
