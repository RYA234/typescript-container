import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chat, health } from './controller';

const router = Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

router.get('/health', health);
router.post('/chat', limiter, chat);

export default router;
