import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RecipeController } from './controller';

const router = Router();
const recipeController = new RecipeController();

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'リクエストが多すぎます。1分後に再試行してください。' },
});

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  router.post('/ingest', recipeController.ingest);
  router.delete('/recipes', recipeController.deleteAll);
}

router.post('/suggest', rateLimiter, recipeController.suggest);

export default router;
