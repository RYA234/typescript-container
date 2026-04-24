import { test, expect } from '@playwright/test';

test.describe('Agent research', () => {
  test('GET /health - 200を返す', async ({ request }) => {
    const res = await request.get('/node/agent/research/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('POST /chat - message未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/research/chat', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });

  test('POST /chat - 空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/research/chat', { data: { message: '' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });

  test('POST /chat - maxIterationsが負数で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/research/chat', { data: { message: 'TypeScriptについて', maxIterations: -1 } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_MAX_ITERATIONS');
  });
});
