import { Router } from 'express';
import { SampleController } from './controller';

const router = Router();
const sampleController = new SampleController();

router.get('/', sampleController.getIndex);
router.get('/health', sampleController.getHealth);

export default router;
