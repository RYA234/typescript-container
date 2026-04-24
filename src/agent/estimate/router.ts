import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chat, health } from './controller';

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'RATE_LIMIT', message: 'リクエスト上限に達しました。1分後に再試行してください。' },
});

router.post('/chat', limiter, chat);
router.get('/health', health);

export default router;
