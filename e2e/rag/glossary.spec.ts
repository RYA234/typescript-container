import { test, expect } from '@playwright/test';

test.describe('RAG glossary API', () => {
  test('GET /search - q未指定で400を返す', async ({ request }) => {
    const res = await request.get('/node/rag/glossary/search');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });
});
