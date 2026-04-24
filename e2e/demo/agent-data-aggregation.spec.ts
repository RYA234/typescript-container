import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/aggregate';

test.describe('Demo: データ集計エージェント', () => {
  test('エージェントUIデモ - 売上・在庫集計・レポート生成', async ({ page }) => {
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
          reply: '========================\n月次レポート: 2025年1月\n========================\n【売上サマリー】\n  合計売上: 1,250,000 円\n  前月比: +5%\n  売れ筋商品: ノートパソコン（600,000円）\n\n【在庫状況】\n  ノートパソコン: 20台 （回転率 2.3）\n  マウス: 150個 （回転率 5.2）\n========================',
          toolCalls: [
            { name: 'get_sales',       args: { period: '2025-01' }, result: '{"period":"2025-01","totalAmount":1250000,...}' },
            { name: 'get_inventory',   args: {},                    result: '[{"productName":"ノートパソコン",...}]' },
            { name: 'generate_report', args: { salesData: '...', inventoryData: '...' }, result: '月次レポートテキスト生成完了' },
          ],
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, 'データ集計エージェントを開きました', 2000);

    await highlightElement(page, '.data-summary');
    await showCaption(page, '売上データ（3ヶ月分）と在庫データ（5商品）が利用可能です', 2000);

    await showCaption(page, '① 「1月レポート」をクリックします');
    await highlightAndClick(page, '.example-btn:first-child');
    await showCaption(page, 'レポート作成リクエストがセットされました', 1500);

    await showCaption(page, '② 作成するボタンをクリックしてエージェントを呼び出します');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#answerText:not(.loading)', { timeout: 15000 });
    await showCaption(page, 'エージェントがレポートを生成しました', 2000);

    await highlightElement(page, '#toolLog');
    await showCaption(page, 'get_sales → get_inventory → generate_report の順にツールが呼ばれました', 2500);

    await highlightElement(page, '#answerText');
    const answer = await page.locator('#answerText').textContent();
    expect(answer).toContain('1,250,000');
    await showCaption(page, '売上・在庫を横断した月次レポートが生成されました', 2000);

    await showCaption(page, '✅ データ集計エージェントデモ完了', 2000);
  });
});
