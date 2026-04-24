import { Router, Request, Response } from 'express';
import { placeholderHtml } from '../shared/placeholder';
import basicAgentRouter from './basic/router';
import inventoryAgentRouter from './inventory/router';
import orderStatusRouter from './order-status/router';
import unitConvertRouter from './unit-convert/router';
import calendarRouter from './calendar/router';
import creditCheckRouter from './credit-check/router';
import estimateRouter from './estimate/router';
import attendanceRouter from './attendance/router';
import inquiryRoutingRouter from './inquiry-routing/router';
import dataAggregationRouter from './data-aggregation/router';
import ragAgentRouter from './rag-agent/router';
import langGraphRouter from './langgraph/router';
import researchRouter from './research/router';
import multiAgentRouter from './multi-agent/router';
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
// #74 見積もり作成エージェント
router.get('/estimate', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'estimate', 'views', 'estimate-agent.html'));
});
router.use('/estimate', estimateRouter);
// #75 勤怠管理エージェント
router.get('/attendance', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'attendance', 'views', 'attendance-agent.html'));
});
router.use('/attendance', attendanceRouter);
// #76 問い合わせ振り分けエージェント
router.get('/inquiry', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'inquiry-routing', 'views', 'inquiry-routing-agent.html'));
});
router.use('/inquiry', inquiryRoutingRouter);
// #77 データ集計エージェント
router.get('/aggregate', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'data-aggregation', 'views', 'data-aggregation-agent.html'));
});
router.use('/aggregate', dataAggregationRouter);
// #78 RAG + エージェント連携
router.get('/rag', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'rag-agent', 'views', 'rag-agent.html'));
});
router.use('/rag', ragAgentRouter);
// #79 LangGraphエージェント
router.get('/langgraph', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'langgraph', 'views', 'langgraph-agent.html'));
});
router.use('/langgraph', langGraphRouter);
// #80 自律リサーチエージェント
router.get('/research', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'research', 'views', 'research-agent.html'));
});
router.use('/research', researchRouter);
// #81 マルチエージェント
router.get('/multi-agent', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'multi-agent', 'views', 'multi-agent.html'));
});
router.use('/multi-agent', multiAgentRouter);
router.get('/credit-check-dotnet', placeholder('与信チェック + dotnet連携'));

export default router;
