import { test, expect } from '@playwright/test';

/**
 * RAG系・Agent系・その他の既存機能のE2Eテスト
 * 外部API（Claude/Gemini/Supabase）を呼ぶエンドポイントはスキップ
 * UIページ（HTMLを返すGETエンドポイント）の200レスポンスを確認する
 */

test.describe('RAG系 UIページ', () => {
  test('product-catalog ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/rag/product-catalog');
    expect(response?.status()).toBe(200);
  });

  test('faq ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/rag/faq');
    expect(response?.status()).toBe(200);
  });

  test('glossary ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/rag/glossary');
    expect(response?.status()).toBe(200);
  });

  test('recipe ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/rag/recipe');
    expect(response?.status()).toBe(200);
  });

  test('multi-doc ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/rag/multi-doc');
    expect(response?.status()).toBe(200);
  });

  test('company-rules ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/rag/company-rules');
    expect(response?.status()).toBe(200);
  });
});

test.describe('RAG系 プレースホルダーページ', () => {
  const placeholders = [
    { path: '/node/rag/category-filter', name: 'カテゴリ別フィルタリング' },
    { path: '/node/rag/date-filter', name: '日付範囲フィルタリング' },
    { path: '/node/rag/pdf', name: 'PDFドキュメント取り込み' },
    { path: '/node/rag/chat-history', name: '会話履歴検索' },
    { path: '/node/rag/score', name: '根拠スコア表示' },
    { path: '/node/rag/eval', name: 'LangSmith + Ragas評価' },
    { path: '/node/rag/hybrid', name: 'ハイブリッド検索' },
    { path: '/node/rag/multimodal', name: 'マルチモーダルRAG' },
  ];

  for (const { path, name } of placeholders) {
    test(`${name} プレースホルダーが200を返す`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe('Agent系 UIページ', () => {
  test('simple (basic-agent) ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/agent/simple');
    expect(response?.status()).toBe(200);
  });

  test('inventory ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/agent/inventory');
    expect(response?.status()).toBe(200);
  });

  test('order-status ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/agent/order-status');
    expect(response?.status()).toBe(200);
  });

  test('unit-convert ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/agent/unit-convert');
    expect(response?.status()).toBe(200);
  });

  test('calendar ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/agent/calendar');
    expect(response?.status()).toBe(200);
  });
});

test.describe('Agent系 プレースホルダーページ', () => {
  const placeholders = [
    { path: '/node/agent/credit-check', name: '与信チェックエージェント' },
    { path: '/node/agent/estimate', name: '見積もり作成エージェント' },
    { path: '/node/agent/attendance', name: '勤怠管理エージェント' },
    { path: '/node/agent/inquiry', name: '問い合わせ振り分けエージェント' },
    { path: '/node/agent/aggregate', name: 'データ集計エージェント' },
    { path: '/node/agent/langgraph', name: 'LangGraphエージェント' },
    { path: '/node/agent/research', name: '自律リサーチエージェント' },
    { path: '/node/agent/multi', name: 'マルチエージェント' },
    { path: '/node/agent/credit-check-dotnet', name: '与信チェック + dotnet連携' },
  ];

  for (const { path, name } of placeholders) {
    test(`${name} プレースホルダーが200を返す`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe('Chatbot', () => {
  test('chatbot/chat ページが200を返す', async ({ page }) => {
    const response = await page.goto('/node/chat');
    expect(response?.status()).toBe(200);
  });
});

test.describe('Agent API ヘルスチェック', () => {
  test('basic-agent /health が200を返す', async ({ request }) => {
    const response = await request.get('/node/agent/basic/health');
    expect(response.status()).toBe(200);
  });
});
