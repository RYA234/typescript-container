import { Router } from 'express';
import express from 'express';
import path from 'path';
import { PhaserController } from './controller';

const router = Router();
const controller = new PhaserController();

router.use(express.static(path.join(__dirname, 'views')));
router.get('/', controller.getIndex.bind(controller));

export default router;
