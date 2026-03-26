import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FaqController } from './controller';

const router = Router();
const faqController = new FaqController();

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  router.post('/ingest', faqController.ingest);
  router.delete('/faqs', faqController.deleteAll);
}

router.post('/answer', rateLimiter, faqController.answer);

export default router;
