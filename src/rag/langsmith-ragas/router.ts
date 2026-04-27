import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './controller';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

router.get('/config', (_req, res) => {
  const langsmithEnabled = Boolean(
    process.env.LANGCHAIN_API_KEY &&
    !process.env.LANGCHAIN_API_KEY.includes('dummy') &&
    !process.env.LANGCHAIN_API_KEY.includes('demo-'),
  );
  res.json({ langsmithEnabled, writeEnabled: !isProduction });
});

router.post('/query', rateLimiter, controller.query);
router.post('/batch', rateLimiter, controller.batchEval);

export default router;
