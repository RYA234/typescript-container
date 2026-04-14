import { test, expect } from '@playwright/test';

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
