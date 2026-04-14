import { test, expect } from '@playwright/test';

/**
 * Agent系 APIエンドポイントの詳細E2Eテスト
 *
 * 外部API（Gemini）を呼ぶ正常系はテスト対象外。
 * バリデーションエラー（400）とヘルスチェックを中心に確認する。
 */

// -------------------------------------------------------
// basic-agent
// -------------------------------------------------------
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

// -------------------------------------------------------
// inventory-agent
// -------------------------------------------------------
test.describe('Agent inventory', () => {
  test('GET /health - 200を返す', async ({ request }) => {
    const res = await request.get('/node/agent/inventory/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('POST /chat - message未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/inventory/chat', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });

  test('POST /chat - messageが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/inventory/chat', { data: { message: '' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });
});

// -------------------------------------------------------
// order-status-agent
// -------------------------------------------------------
test.describe('Agent order-status', () => {
  test('GET /health - 200を返す', async ({ request }) => {
    const res = await request.get('/node/agent/order-status/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('POST /chat - message未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/order-status/chat', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });

  test('POST /chat - messageが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/order-status/chat', { data: { message: '' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });
});

// -------------------------------------------------------
// unit-convert-agent
// -------------------------------------------------------
test.describe('Agent unit-convert', () => {
  test('GET /health - 200を返す', async ({ request }) => {
    const res = await request.get('/node/agent/unit-convert/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('POST /chat - message未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/unit-convert/chat', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });

  test('POST /chat - messageが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/unit-convert/chat', { data: { message: '' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });
});

// -------------------------------------------------------
// calendar-agent
// -------------------------------------------------------
test.describe('Agent calendar', () => {
  test('GET /health - 200を返す', async ({ request }) => {
    const res = await request.get('/node/agent/calendar/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('POST /chat - message未指定で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/calendar/chat', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });

  test('POST /chat - messageが空文字で400を返す', async ({ request }) => {
    const res = await request.post('/node/agent/calendar/chat', { data: { message: '' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_MESSAGE');
  });
});
