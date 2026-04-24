import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/multi-agent';

test.describe('Demo: マルチエージェント', () => {
  test('エージェントUIデモ - 複数エージェントの協調動作', async ({ page }) => {
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
          reply: 'TypeScript と Python の比較レポート：TypeScript は大規模開発で型安全性を提供し、コードの保守性を向上させます。Python は AI/ML 分野での豊富なライブラリが強みで、手軽にデータ処理が可能です。用途に応じた使い分けが重要です。',
          agentLog: [
            { agent: 'Orchestrator', action: 'タスク分解', result: ['TypeScript の特徴を調査', 'Python の特徴を調査', '比較レポート作成'] },
            { agent: 'ResearchAgent', action: 'TypeScript の特徴を調査', result: 'TypeScript は Microsoft 製の型付き言語で大規模開発に適しています。' },
            { agent: 'ResearchAgent', action: 'Python の特徴を調査', result: 'Python は動的型付けで AI/ML 分野で広く利用されています。' },
            { agent: 'SummaryAgent', action: 'まとめ', result: 'TypeScript と Python の比較レポート：TypeScript は大規模開発向き、Python は AI/ML 向きです。' },
          ],
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, 'マルチエージェントを開きました', 2000);

    await highlightElement(page, '.pipeline');
    await showCaption(page, 'Orchestrator → ResearchAgent × N → SummaryAgent のパイプライン', 2000);

    await showCaption(page, '① クエリ例「TypeScript vs Python 比較」をクリックします');
    await highlightAndClick(page, '.example-btn:first-child');
    await showCaption(page, 'タスクがセットされました', 1500);

    await showCaption(page, '② 実行ボタンをクリックして複数エージェントを起動します');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#replyText:not(:empty)', { timeout: 15000 });
    await showCaption(page, '4つのエージェントが順番に動作しました', 2000);

    await highlightElement(page, '#replyText');
    const reply = await page.locator('#replyText').textContent();
    expect(reply).toContain('TypeScript');
    await showCaption(page, 'SummaryAgent が最終レポートを生成しました', 2000);

    await highlightElement(page, '#agentLog');
    await showCaption(page, 'エージェントログ - 各エージェントの実行結果が可視化されています', 2000);

    const logEntries = await page.locator('.log-entry').count();
    expect(logEntries).toBe(4);
    await showCaption(page, `${logEntries}件のエージェントアクションが記録されました`, 2000);

    await showCaption(page, '✅ マルチエージェントデモ完了', 2000);
  });
});
