import { Router, Request, Response } from 'express';
import { placeholderHtml } from '../shared/placeholder';
import { RagController } from './company-rules/controller';
import path from 'path';
import rateLimit from 'express-rate-limit';

const ragReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

const router = Router();
const ragController = new RagController();

const placeholder = (name: string) => (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(placeholderHtml(name));
};

// #53 就業規則Q&A
const isProduction = process.env.NODE_ENV === 'production';

router.get('/company-rules', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'company-rules', 'views', 'company-rules.html'));
});
router.get('/company-rules/config', (_req: Request, res: Response) => {
  res.json({ writeEnabled: !isProduction });
});
if (!isProduction) {
  router.post('/company-rules/ingest', ragController.ingest);
  router.delete('/company-rules/documents', ragController.deleteDocuments);
}
router.get('/company-rules/search', ragReadLimiter, ragController.search);
router.post('/company-rules/query', ragReadLimiter, ragController.query);

router.get('/product-catalog', placeholder('商品カタログ検索'));
router.get('/faq', placeholder('FAQ自動回答'));
router.get('/glossary', placeholder('社内用語集検索'));
router.get('/recipe', placeholder('料理レシピ検索'));
router.get('/multi-doc', placeholder('複数ドキュメント横断検索'));
router.get('/category-filter', placeholder('カテゴリ別フィルタリング'));
router.get('/date-filter', placeholder('日付範囲フィルタリング'));
router.get('/pdf', placeholder('PDFドキュメント取り込み'));
router.get('/chat-history', placeholder('会話履歴検索'));
router.get('/agent', placeholder('RAG + エージェント連携'));
router.get('/score', placeholder('根拠スコア表示'));
router.get('/eval', placeholder('LangSmith + Ragas評価'));
router.get('/hybrid', placeholder('ハイブリッド検索'));
router.get('/multimodal', placeholder('マルチモーダルRAG'));

export default router;
