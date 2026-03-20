import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { BasicAgentController } from './controller';

const router = Router();
const controller = new BasicAgentController();

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

router.post('/chat', rateLimiter, controller.chat);
router.get('/health', controller.health);

export default router;
