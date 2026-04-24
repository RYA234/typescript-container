import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/rag';

test.describe('Demo: RAG + エージェント連携', () => {
  test('エージェントUIデモ - ドキュメント検索・計算連携', async ({ page }) => {
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
          reply: 'プロジェクトXの総予算は5,000,000円で、使用済み予算は2,300,000円です。残予算は 5,000,000 - 2,300,000 = 2,700,000円となります。',
          toolCalls: [
            { name: 'search_documents', args: { query: 'プロジェクトX 予算' }, result: '[1] プロジェクトXの総予算は5,000,000円 (出典: project-x.txt)\n[2] 使用済み予算: 2,300,000円 (出典: budget-report.txt)' },
            { name: 'calculate', args: { expression: '5000000 - 2300000' }, result: '5000000 - 2300000 = 2,700,000' },
          ],
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, 'RAG + エージェント連携を開きました', 2000);

    await highlightElement(page, '.docs-list');
    await showCaption(page, '検索可能な社内ドキュメント一覧（予算・就業規則・ポリシー）', 2000);

    await showCaption(page, '① 「残予算を計算」をクリックします');
    await highlightAndClick(page, '.example-btn:first-child');
    await showCaption(page, 'RAG検索 + 計算の複合クエリがセットされました', 1500);

    await showCaption(page, '② 質問するボタンをクリックしてエージェントを呼び出します');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#answerText:not(.loading)', { timeout: 15000 });
    await showCaption(page, 'エージェントがドキュメント検索と計算を組み合わせて回答しました', 2000);

    await highlightElement(page, '#toolLog');
    await showCaption(page, 'search_documents → calculate の順にツールが呼ばれました', 2500);

    await highlightElement(page, '#answerText');
    const answer = await page.locator('#answerText').textContent();
    expect(answer).toContain('2,700,000');
    await showCaption(page, 'RAGで取得した数値を使った計算結果が回答に含まれています', 2000);

    await showCaption(page, '✅ RAG + エージェント連携デモ完了', 2000);
  });
});
