import { Router } from 'express';
import multer from 'multer';
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('PDFファイルのみ許可されています'));
  },
});

router.get('/config', (_req, res) => {
  res.json({ writeEnabled: !isProduction });
});

router.get('/list', rateLimiter, controller.list);
router.post('/query', rateLimiter, controller.query);

if (!isProduction) {
  router.post('/upload', upload.single('file'), controller.upload);
  router.delete('/documents', controller.deleteAll);
}

export default router;
