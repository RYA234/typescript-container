import { test, expect } from '@playwright/test';
import { showCaption, highlightAndClick, highlightElement } from '../helpers';

const BASE = '/node/agent/credit-check';

test.describe('Demo: 与信チェックエージェント', () => {
  test('エージェントUIデモ - バリデーション・スコアリング・判定', async ({ page }) => {
    test.setTimeout(90000);
    // APIをモックしてGemini不要でデモ
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
          answer: '株式会社サンプルの与信審査結果：バリデーション OK、スコア 75 点、判定は「承認」です。問題なくお取引を進めていただけます。',
          toolsUsed: [
            { name: 'validate_company', input: { companyName: '株式会社サンプル' }, output: { result: 'valid' } },
            { name: 'score_credit',     input: { companyName: '株式会社サンプル' }, output: { score: 75 } },
            { name: 'judge_credit',     input: { score: 75 },                       output: { judgment: '承認' } },
          ],
          executionTimeMs: 7025,
        }),
      });
    });

    // 1. ページを開く
    await page.goto(BASE);
    await showCaption(page, '与信チェックエージェントを開きました', 2000);

    // 2. テスト用会社テーブルを確認
    await highlightElement(page, '.company-table');
    await showCaption(page, 'テスト用会社データ（スコア・判定）が表示されています', 2000);

    // 3. 質問例ボタンをクリック
    await showCaption(page, '① 質問例「株式会社サンプル」をクリックします');
    await highlightAndClick(page, '.example-btn');
    await showCaption(page, '質問例が入力フォームにセットされました', 1500);

    const inputValue = await page.locator('#messageInput').inputValue();
    await showCaption(page, `入力値: "${inputValue}"`, 1500);

    // 4. 送信ボタンをクリック
    await showCaption(page, '② 送信ボタンをクリックしてエージェントを呼び出します');
    await highlightAndClick(page, '#sendBtn');

    // 5. レスポンスを待つ
    await page.waitForSelector('#result', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#answerText:not(.loading)', { timeout: 15000 });
    await showCaption(page, 'エージェントが与信チェックを実行して回答しました', 2000);

    // 6. ツールコールを確認
    await highlightElement(page, '#toolLog');
    await showCaption(page, 'validate_company → score_credit → judge_credit の3ツールが順番に呼ばれました', 2500);

    // 7. 回答テキストを確認
    await highlightElement(page, '#answerText');
    const answer = await page.locator('#answerText').textContent();
    expect(answer).toContain('承認');
    await showCaption(page, `回答: "${answer?.trim()}"`, 2000);

    // 8. 否認ケースのデモ
    await showCaption(page, '③ 否認ケース「株式会社不審」を試してみます');
    await page.locator('#messageInput').fill('株式会社不審の与信チェックをお願いします');
    await highlightElement(page, '#messageInput');
    await showCaption(page, 'スコア30点 → 否認となる会社を入力しました', 1500);

    // 9. invalidケースのデモ
    await showCaption(page, '④ invalidケース「架空企業」を試してみます');
    await page.locator('#messageInput').fill('架空企業の与信チェックをして');
    await highlightElement(page, '#messageInput');
    await showCaption(page, 'バリデーションで弾かれる会社 — スコアリングまで進みません', 2000);

    await showCaption(page, '✅ 与信チェックエージェントデモ完了', 2000);
  });
});
