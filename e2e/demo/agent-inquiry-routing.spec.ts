import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/inquiry';

test.describe('Demo: 問い合わせ振り分けエージェント', () => {
  test('エージェントUIデモ - カテゴリ分類・チケット作成', async ({ page }) => {
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
          reply: 'お問い合わせを物流部門に転送し、チケット TKT-001 を作成しました。担当者より順次ご連絡いたします。',
          toolCalls: [
            { name: 'analyze_inquiry', args: { text: body.message }, result: '配送問題' },
            { name: 'get_department',  args: { category: '配送問題' }, result: '物流部門' },
            { name: 'create_ticket',   args: { content: body.message, department: '物流部門' }, result: 'TKT-001' },
          ],
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, '問い合わせ振り分けエージェントを開きました', 2000);

    await highlightElement(page, '.dept-table');
    await showCaption(page, 'カテゴリと担当部門のマッピングテーブル', 2000);

    await showCaption(page, '① 「配送問題」の例文をクリックします');
    await highlightAndClick(page, '.example-btn:first-child');
    await showCaption(page, '問い合わせ文がセットされました', 1500);

    await showCaption(page, '② 送信ボタンをクリックしてエージェントを呼び出します');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#answerText:not(.loading)', { timeout: 15000 });
    await showCaption(page, 'エージェントが自動振り分けしました', 2000);

    await highlightElement(page, '#toolLog');
    await showCaption(page, 'analyze_inquiry → get_department → create_ticket の順にツールが呼ばれました', 2500);

    await highlightElement(page, '#answerText');
    const answer = await page.locator('#answerText').textContent();
    expect(answer).toContain('TKT-001');
    await showCaption(page, 'チケットIDが発行されました', 2000);

    await showCaption(page, '✅ 問い合わせ振り分けエージェントデモ完了', 2000);
  });
});
