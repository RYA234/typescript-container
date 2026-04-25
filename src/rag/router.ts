import { Router, Request, Response } from 'express';
import { placeholderHtml } from '../shared/placeholder';
import { RagController } from './company-rules/controller';
import productRouter from './product/router';
import faqRouter from './faq/router';
import glossaryRouter from './glossary/router';
import recipeRouter from './recipe/router';
import multiDocRouter from './multi-doc/router';
import categoryFilterRouter from './category-filter/router';
import dateFilterRouter from './date-filter/router';
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

// #54 商品カタログ検索
router.get('/product-catalog', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'product', 'views', 'product-catalog.html'));
});
router.use('/product', productRouter);

// #55 FAQ自動回答
router.get('/faq', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'faq', 'views', 'faq.html'));
});
router.use('/faq', faqRouter);
// #56 社内用語集検索
router.get('/glossary', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'glossary', 'views', 'glossary.html'));
});
router.use('/glossary', glossaryRouter);
// #57 料理レシピ検索
router.get('/recipe', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'recipe', 'views', 'recipe.html'));
});
router.use('/recipe', recipeRouter);
// #58 複数ドキュメント横断検索
router.get('/multi-doc', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'multi-doc', 'views', 'multi-doc.html'));
});
router.use('/multi-doc', multiDocRouter);
// #59 カテゴリ別フィルタリング
router.get('/category-filter', (_req, res) => {
  res.sendFile(path.join(__dirname, 'category-filter', 'views', 'category-filter.html'));
});
router.use('/category-filter', categoryFilterRouter);
// #60 日付範囲フィルタリング
router.get('/date-filter', (_req, res) => {
  res.sendFile(path.join(__dirname, 'date-filter', 'views', 'date-filter.html'));
});
router.use('/date-filter', dateFilterRouter);
router.get('/pdf', placeholder('PDFドキュメント取り込み'));
router.get('/chat-history', placeholder('会話履歴検索'));
router.get('/agent', placeholder('RAG + エージェント連携'));
router.get('/score', placeholder('根拠スコア表示'));
router.get('/eval', placeholder('LangSmith + Ragas評価'));
router.get('/hybrid', placeholder('ハイブリッド検索'));
router.get('/multimodal', placeholder('マルチモーダルRAG'));

export default router;
