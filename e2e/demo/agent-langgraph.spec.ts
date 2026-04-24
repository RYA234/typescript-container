import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/langgraph';

test.describe('Demo: LangGraphエージェント', () => {
  test('エージェントUIデモ - 状態グラフによる自動振り分け', async ({ page }) => {
    test.setTimeout(90000);
    await page.route(`${BASE}/chat`, async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      if (!body.message || body.message.trim() === '') {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'MISSING_MESSAGE', message: 'messageは必須です' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: '東京都の人口は約1,400万人（2024年）です。日本最大の都市圏を形成しています。',
          graphPath: ['classify', 'search', 'answer'],
          state: { messageType: 'search', searchResult: '東京都人口: 約1,400万人（2024年）' },
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, 'LangGraphエージェントを開きました', 2000);

    await highlightElement(page, '.graph-diagram');
    await showCaption(page, 'classify → search/calculate/answer の状態遷移グラフ', 2000);

    await showCaption(page, '① 「検索: 東京の人口」をクリックします');
    await highlightAndClick(page, '.example-btn:first-child');
    await showCaption(page, '検索クエリがセットされました', 1500);

    await showCaption(page, '② 実行ボタンをクリックしてグラフを動かします');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#answerText:not(.loading)', { timeout: 15000 });
    await showCaption(page, 'グラフが classify → search → answer を経由して回答しました', 2000);

    await highlightElement(page, '#graphPath');
    await showCaption(page, '実行されたノードパスが可視化されています', 2000);

    await highlightElement(page, '#answerText');
    const answer = await page.locator('#answerText').textContent();
    expect(answer).toContain('東京');
    await showCaption(page, '状態グラフが検索ノードを経由して回答を生成しました', 2000);

    await showCaption(page, '✅ LangGraphエージェントデモ完了', 2000);
  });
});
