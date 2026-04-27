import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './controller';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

router.get('/config', (_req, res) => {
  res.json({ writeEnabled: !isProduction });
});

router.get('/history', rateLimiter, controller.history);
router.post('/search', rateLimiter, controller.search);

if (!isProduction) {
  router.post('/post', controller.post);
  router.delete('/messages', controller.deleteAll);
}

export default router;
