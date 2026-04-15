import { test, expect } from '@playwright/test';

test.describe('Agent basic', () => {
  test('GET /health - 200を返す', async ({ request }) => {
    const res = await request.get('/node/agent/basic/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('POST /chat - message未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/basic/chat', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });

  test('POST /chat - messageが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/basic/chat', { data: { message: '   ' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_PARAM');
  });
});
