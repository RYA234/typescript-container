# テスト仕様書 - 実装状況ダッシュボード

## 1. テスト方針

- `GET /` のエンドポイントテストのみ

---

## 2. テストケース一覧

| No | テスト名 | 確認内容 | 期待結果 |
|----|---------|---------|---------|
| 1 | 正常レスポンス | ステータスコード | 200 |
| 2 | Content-Type | HTMLが返る | `text/html` を含む |
| 3 | RAGセクション | RAG編の見出しが含まれる | `RAG編` を含む |
| 4 | エージェントセクション | AIエージェント編の見出しが含まれる | `AIエージェント編` を含む |
| 5 | 実装済み表示 | ✅が含まれる | `✅` を含む |
| 6 | 未実装表示 | ❌が含まれる | `❌` を含む |
| 7 | 凡例表示 | 凡例テキストが含まれる | `実装済み` を含む |

---

## 3. テストコード例

```typescript
import request from 'supertest';
import app from '../../app';

describe('GET /', () => {
  it('200でHTMLを返す', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('RAG編・AIエージェント編が含まれる', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('RAG編');
    expect(res.text).toContain('AIエージェント編');
  });

  it('✅と❌が含まれる', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('✅');
    expect(res.text).toContain('❌');
  });
});
```
