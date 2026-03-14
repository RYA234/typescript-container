/**
 * 未実装機能のプレースホルダーHTML生成関数
 *
 * 未実装のエンドポイント（/rag/*, /agent/*）にアクセスされた際に
 * 「開発中」ページを返すために使用する。
 *
 * 機能を実装したら該当のrouter.tsでこの関数の呼び出しを削除し、
 * 実際のControllerに差し替える。
 *
 * @param featureName 画面に表示する機能名（例: "FAQ自動回答"）
 */
export const placeholderHtml = (featureName: string): string => `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${featureName} - 開発中</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex; justify-content: center; align-items: center;
    }
    .card {
      background: white; border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 60px 40px; text-align: center; max-width: 480px; width: 100%;
    }
    .icon { font-size: 4rem; margin-bottom: 20px; }
    h1 { color: #333; font-size: 1.5rem; margin-bottom: 12px; }
    p { color: #666; margin-bottom: 30px; }
    a {
      display: inline-block; padding: 10px 24px;
      background: #667eea; color: white; border-radius: 8px;
      text-decoration: none; font-weight: 600;
    }
    a:hover { background: #5a6fd6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚧</div>
    <h1>${featureName}</h1>
    <p>この機能は現在開発中です。</p>
    <a href="/node/">← トップに戻る</a>
  </div>
</body>
</html>`;
