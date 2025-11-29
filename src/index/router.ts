import { Router } from 'express';
import { IndexController } from './controller';

const router = Router();
const indexController = new IndexController();

router.get('/', indexController.getIndex);

export default router;
