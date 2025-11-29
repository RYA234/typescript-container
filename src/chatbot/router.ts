import { Router } from 'express';
import { ChatbotController } from './controller';

const router = Router();
const chatbotController = new ChatbotController();

router.get('/chat', chatbotController.getIndex);
router.post('/chat', chatbotController.postChat);

export default router;
