import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { MultiDocController } from './controller';

const router = Router();
const multiDocController = new MultiDocController();

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  router.post('/ingest', multiDocController.ingest);
  router.delete('/documents', multiDocController.deleteAll);
}

router.post('/query', rateLimiter, multiDocController.query);
router.get('/documents', rateLimiter, multiDocController.list);

export default router;
