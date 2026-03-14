# 操作手順書 - 実装状況ダッシュボード

## 1. 動作確認

```bash
# サーバー起動
npm run dev

# ブラウザで確認
http://localhost:3000/
```

---

## 2. ステータスの更新方法

機能を実装したら `src/dashboard/controller.ts` の該当行を更新する。

```typescript
// 変更前
{ name: '就業規則Q&A', level: '初級', status: 'todo' },

// 変更後（pathも追加する）
{ name: '就業規則Q&A', level: '初級', status: 'done', path: '/rag/company-rules' },
```

---

## 3. トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `GET /` が404 | router.tsがapp.tsに登録されていない | `app.use('/', dashboardRouter)` を確認 |
| ステータスが更新されない | サーバー再起動が必要 | `npm run dev` を再起動 |
