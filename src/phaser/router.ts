import { Router } from 'express';
import express from 'express';
import path from 'path';
import { PhaserController } from './controller';

const router = Router({ strict: false });
const controller = new PhaserController();

router.get('/', controller.getIndex.bind(controller));
router.get(['/character-management', '/character-management/'], controller.getCharacterManagement.bind(controller));
router.use(express.static(path.join(__dirname, 'views'), { redirect: false }));

export default router;
