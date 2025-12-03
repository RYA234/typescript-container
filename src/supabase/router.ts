import { Router } from 'express';
import { SupabaseController } from './controller';

const router = Router();
const supabaseController = new SupabaseController();

/**
 * GET /node/supabase/test
 * Supabase接続テスト
 */
router.get('/test', (req, res) => supabaseController.testConnection(req, res));

export default router;
