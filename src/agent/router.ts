import { Router, Request, Response } from 'express';
import { placeholderHtml } from '../shared/placeholder';
import basicAgentRouter from './basic/router';
import path from 'path';

const router = Router();

const placeholder = (name: string) => (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(placeholderHtml(name));
};

// #68 天気・計算・時刻エージェント
router.get('/simple', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'basic', 'views', 'basic-agent.html'));
});
router.use('/basic', basicAgentRouter);
router.get('/inventory', placeholder('在庫確認エージェント'));
router.get('/order-status', placeholder('注文ステータス確認エージェント'));
router.get('/unit-convert', placeholder('単位変換エージェント'));
router.get('/calendar', placeholder('カレンダー確認エージェント'));
router.get('/credit-check', placeholder('与信チェックエージェント'));
router.get('/estimate', placeholder('見積もり作成エージェント'));
router.get('/attendance', placeholder('勤怠管理エージェント'));
router.get('/inquiry', placeholder('問い合わせ振り分けエージェント'));
router.get('/aggregate', placeholder('データ集計エージェント'));
router.get('/rag', placeholder('RAG + エージェント連携'));
router.get('/langgraph', placeholder('LangGraphエージェント'));
router.get('/research', placeholder('自律リサーチエージェント'));
router.get('/multi', placeholder('マルチエージェント'));
router.get('/credit-check-dotnet', placeholder('与信チェック + dotnet連携'));

export default router;
