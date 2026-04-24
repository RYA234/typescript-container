import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/attendance';

test.describe('Demo: 勤怠管理エージェント', () => {
  test('エージェントUIデモ - 出勤記録・残業時間計算', async ({ page }) => {
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
          reply: '田中さんの2025年1月の残業時間は34時間15分です。月の法定上限（45時間）内に収まっています。',
          toolCalls: [
            { name: 'get_attendance', args: { userId: '田中', date: '2025-01' }, result: '2025-01-06 出勤 09:00\n2025-01-06 退勤 22:30\n...' },
            { name: 'calc_overtime',  args: { userId: '田中', month: '2025-01' }, result: '田中さんの2025-01の残業時間は34時間15分です' },
          ],
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, '勤怠管理エージェントを開きました', 2000);

    await showCaption(page, '① 「田中さんの1月残業時間は？」をクリックします');
    await highlightAndClick(page, '.example-btn:nth-child(3)');
    await showCaption(page, '残業時間確認リクエストがセットされました', 1500);

    const inputValue = await page.locator('#messageInput').inputValue();
    await showCaption(page, `入力値: "${inputValue}"`, 1500);

    await showCaption(page, '② 送信ボタンをクリックしてエージェントを呼び出します');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#answerText:not(.loading)', { timeout: 15000 });
    await showCaption(page, 'エージェントが勤怠情報を確認しました', 2000);

    await highlightElement(page, '#toolLog');
    await showCaption(page, 'get_attendance → calc_overtime の順にツールが呼ばれました', 2500);

    await highlightElement(page, '#answerText');
    const answer = await page.locator('#answerText').textContent();
    expect(answer).toContain('残業時間');
    await showCaption(page, '残業時間の集計結果が返ってきました', 2000);

    await showCaption(page, '✅ 勤怠管理エージェントデモ完了', 2000);
  });
});
