import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { GlossaryController } from './controller';

const router = Router();
const glossaryController = new GlossaryController();

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  router.post('/ingest', glossaryController.ingest);
  router.delete('/terms', glossaryController.deleteAll);
}

router.get('/search', rateLimiter, glossaryController.search);

export default router;
