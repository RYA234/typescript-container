import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/research';

test.describe('Demo: 自律リサーチエージェント', () => {
  test('エージェントUIデモ - 反復的な調査と自律的な継続判断', async ({ page }) => {
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
          reply: 'TypeScript 5.3 が2024年にリリースされました。Import Attributes のサポートや型チェック精度の向上など、開発体験を大きく改善する機能が追加されています。',
          iterations: 2,
          searchHistory: [
            {
              query: 'TypeScript 最新バージョンについて調べて',
              rawResult: '【TypeScript 最新バージョン】TypeScript 5.3 が 2024 年にリリース。Import Attributes サポート、stricterオプション追加。',
              summary: 'TypeScript 5.3 が2024年リリース。Import Attributes をサポート。',
            },
            {
              query: 'TypeScript 5.3 新機能',
              rawResult: '【TypeScript 5.3 新機能】Import Attributes、switch(true) パターン対応、速度改善。型チェック精度向上。',
              summary: 'TypeScript 5.3 の主要新機能はImport Attributesとswitch(true)パターン対応。',
            },
          ],
        }),
      });
    });

    await page.goto(BASE);
    await showCaption(page, '自律リサーチエージェントを開きました', 2000);

    await showCaption(page, '① クエリ例「TypeScript 最新バージョン」をクリックします');
    await highlightAndClick(page, '.example-btn:first-child');
    await showCaption(page, 'クエリがセットされました', 1500);

    await showCaption(page, '② イテレーション数を確認します（デフォルト3回）');
    await highlightElement(page, '#maxIter');
    await showCaption(page, '最大3回まで反復調査します', 1500);

    await showCaption(page, '③ リサーチ開始ボタンをクリックします');
    await highlightAndClick(page, '#sendBtn');

    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#replyText:not(:empty)', { timeout: 15000 });
    await showCaption(page, 'エージェントが2回のイテレーションで調査を完了しました', 2000);

    await highlightElement(page, '#replyText');
    const reply = await page.locator('#replyText').textContent();
    expect(reply).toContain('TypeScript');
    await showCaption(page, '最終回答が生成されました', 2000);

    await highlightElement(page, '#historyList');
    await showCaption(page, 'リサーチ履歴 - 各イテレーションの検索結果と要約', 2000);

    const iterCount = await page.locator('#iterCount').textContent();
    expect(iterCount).toContain('2');
    await showCaption(page, `実行回数: ${iterCount?.trim()}回`, 1500);

    await showCaption(page, '✅ 自律リサーチエージェントデモ完了', 2000);
  });
});
