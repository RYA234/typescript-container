import { Router, Request, Response } from 'express';
import { placeholderHtml } from '../shared/placeholder';
import basicAgentRouter from './basic/router';
import inventoryAgentRouter from './inventory/router';
import orderStatusRouter from './order-status/router';
import unitConvertRouter from './unit-convert/router';
import calendarRouter from './calendar/router';
import creditCheckRouter from './credit-check/router';
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
// #69 在庫確認エージェント
router.get('/inventory', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'inventory', 'views', 'inventory-agent.html'));
});
router.use('/inventory', inventoryAgentRouter);
// #70 注文ステータス確認エージェント
router.get('/order-status', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'order-status', 'views', 'order-status-agent.html'));
});
router.use('/order-status', orderStatusRouter);
// #71 単位変換エージェント
router.get('/unit-convert', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'unit-convert', 'views', 'unit-convert-agent.html'));
});
router.use('/unit-convert', unitConvertRouter);
// #72 カレンダー確認エージェント
router.get('/calendar', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'calendar', 'views', 'calendar-agent.html'));
});
router.use('/calendar', calendarRouter);
// #73 与信チェックエージェント
router.get('/credit-check', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'credit-check', 'views', 'credit-check-agent.html'));
});
router.use('/credit-check', creditCheckRouter);
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
