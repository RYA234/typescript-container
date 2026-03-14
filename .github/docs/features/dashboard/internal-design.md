# 内部設計書 - 実装状況ダッシュボード

## 1. ディレクトリ構成

```
src/dashboard/
├── router.ts         # ルーティング定義
├── controller.ts     # HTML生成 + ステータス定義
└── tests/
    └── dashboard.test.ts
```

---

## 2. 実装詳細

### controller.ts

ステータス定義とHTML生成をまとめて管理する。

```typescript
import { Request, Response } from 'express';

type Status = 'done' | 'todo';
type Level = '初級' | '中級' | '上級';

interface Feature {
  name: string;
  level: Level;
  status: Status;
  path?: string;
}

const ragFeatures: Feature[] = [
  { name: '就業規則Q&A', level: '初級', status: 'done', path: '/rag/company-rules' },
  { name: '商品カタログ検索', level: '初級', status: 'todo' },
  { name: 'FAQ自動回答', level: '初級', status: 'todo' },
  { name: '社内用語集検索', level: '初級', status: 'todo' },
  { name: '料理レシピ検索', level: '初級', status: 'todo' },
  { name: '複数ドキュメント横断検索', level: '中級', status: 'todo' },
  { name: 'カテゴリ別フィルタリング', level: '中級', status: 'todo' },
  { name: '日付範囲フィルタリング', level: '中級', status: 'todo' },
  { name: 'PDFドキュメント取り込み', level: '中級', status: 'todo' },
  { name: '会話履歴検索', level: '中級', status: 'todo' },
  { name: 'RAG + エージェント連携', level: '上級', status: 'todo' },
  { name: '根拠スコア表示', level: '上級', status: 'todo' },
  { name: 'LangSmith + Ragas評価', level: '上級', status: 'todo' },
  { name: 'ハイブリッド検索', level: '上級', status: 'todo' },
  { name: 'マルチモーダルRAG', level: '上級', status: 'todo' },
];

const agentFeatures: Feature[] = [
  { name: '天気・計算・時刻エージェント', level: '初級', status: 'todo' },
  { name: '在庫確認エージェント', level: '初級', status: 'todo' },
  { name: '注文ステータス確認エージェント', level: '初級', status: 'todo' },
  { name: '単位変換エージェント', level: '初級', status: 'todo' },
  { name: 'カレンダー確認エージェント', level: '初級', status: 'todo' },
  { name: '与信チェックエージェント', level: '中級', status: 'todo' },
  { name: '見積もり作成エージェント', level: '中級', status: 'todo' },
  { name: '勤怠管理エージェント', level: '中級', status: 'todo' },
  { name: '問い合わせ振り分けエージェント', level: '中級', status: 'todo' },
  { name: 'データ集計エージェント', level: '中級', status: 'todo' },
  { name: 'RAG + エージェント連携', level: '上級', status: 'todo' },
  { name: 'LangGraphエージェント', level: '上級', status: 'todo' },
  { name: '自律リサーチエージェント', level: '上級', status: 'todo' },
  { name: 'マルチエージェント', level: '上級', status: 'todo' },
  { name: '与信チェック + dotnet連携', level: '上級', status: 'todo' },
];

const otherFeatures: Feature[] = [
  { name: 'Gemini AI Chatbot', level: '初級', status: 'done', path: '/ai/chat' },
];

const renderRows = (features: Feature[]): string =>
  features.map(f => {
    const emoji = f.status === 'done' ? '✅' : '❌';
    const label = f.path ? `<a href="${f.path}">${f.name}</a>` : f.name;
    return `<tr><td>${emoji}</td><td>${label}</td><td>${f.level}</td></tr>`;
  }).join('');

export class DashboardController {
  getIndex(req: Request, res: Response): void {
    const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>TypeScript AI Container</title></head>
<body>
  <h1>TypeScript AI Container</h1>
  <h2>📦 RAG編</h2>
  <table border="1">
    <tr><th>状態</th><th>機能名</th><th>難易度</th></tr>
    ${renderRows(ragFeatures)}
  </table>
  <h2>🤖 AIエージェント編</h2>
  <table border="1">
    <tr><th>状態</th><th>機能名</th><th>難易度</th></tr>
    ${renderRows(agentFeatures)}
  </table>
  <h2>🔧 その他</h2>
  <table border="1">
    <tr><th>状態</th><th>機能名</th></tr>
    ${renderRows(otherFeatures)}
  </table>
  <p>凡例: ✅ 実装済み　❌ 未実装</p>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}
```

---

### router.ts

```typescript
import { Router } from 'express';
import { DashboardController } from './controller';

const router = Router();
const controller = new DashboardController();

router.get('/', (req, res) => controller.getIndex(req, res));

export default router;
```

---

### app.ts への組み込み

```typescript
import dashboardRouter from './dashboard/router';
app.use('/', dashboardRouter);
```

---

## 3. ステータス更新方法

機能を実装したら `controller.ts` の該当行を更新する。

```typescript
// 変更前
{ name: '就業規則Q&A', level: '初級', status: 'todo' },

// 変更後
{ name: '就業規則Q&A', level: '初級', status: 'done', path: '/rag/company-rules' },
```
