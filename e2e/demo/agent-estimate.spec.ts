import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/estimate';

test.describe('Demo: 見積もり作成エージェント', () => {
  test('エージェントUIデモ - 商品検索・小計計算・見積書生成', async ({ page }) => {
    test.setTimeout(90000);
    await page.route(`${BASE}/chat`, async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      if (!body.message || body.message.trim() === '') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'MISSING_MESSAGE', message: 'messageは必須です' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: '見積書を作成しました。\n\n見積書\n================\nノートパソコン  2台    120,000    240,000\nマウス          3個    2,500      7,500\n================\n合計: 247,500円\n================',
          toolsUsed: [
            { name: 'search_product', input: { productName: 'ノートパソコン' }, output: { id: 'PC-001', price: 120000, unit: '台' } },
            { name: 'calc_subtotal',  input: { productId: 'PC-001', quantity: 2 }, output: { subtotal: 240000 } },
            { name: 'search_product', input: { productName: 'マウス' }, output: { id: 'ACC-001', price: 2500, unit: '個' } },
            { name: 'calc_subtotal',  input: { productId: 'ACC-001', quantity: 3 }, output: { subtotal: 7500 } },
            { name: 'generate_quote', input: { items: [] }, output: { total: 247500 } },
          ],
          executionTimeMs: 9500,
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, '見積もり作成エージェントを開きました', 2000);

    await highlightElement(page, '.products-table');
    await showCaption(page, '対応商品カタログ（ノートパソコン・マウス・キーボード・モニター・プリンター）', 2000);

    await showCaption(page, '① 質問例「PC一式5セット」をクリックします');
    await highlightAndClick(page, '.example-btn');
    await showCaption(page, '複数商品の見積もりリクエストがセットされました', 1500);

    const inputValue = await page.locator('#messageInput').inputValue();
    await showCaption(page, `入力値: "${inputValue}"`, 1500);

    await showCaption(page, '② 送信ボタンをクリックしてエージェントを呼び出します');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#answerText:not(.loading)', { timeout: 15000 });
    await showCaption(page, 'エージェントが見積書を生成しました', 2000);

    await highlightElement(page, '#toolLog');
    await showCaption(page, 'search_product → calc_subtotal → generate_quote の順にツールが呼ばれました', 2500);

    await highlightElement(page, '#answerText');
    const answer = await page.locator('#answerText').textContent();
    expect(answer).toContain('見積書');
    await showCaption(page, '見積書テキストが回答として返ってきました', 2000);

    await showCaption(page, '③ 存在しない商品を試してみます');
    await page.locator('#messageInput').fill('存在しない商品の見積もりをお願いします');
    await highlightElement(page, '#messageInput');
    await showCaption(page, 'カタログにない商品 — エラーメッセージが返ります', 2000);

    await showCaption(page, '✅ 見積もり作成エージェントデモ完了', 2000);
  });
});
