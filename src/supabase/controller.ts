import { Request, Response } from 'express';
import { SupabaseService } from './service';

/**
 * Supabaseコントローラー
 */
export class SupabaseController {
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  /**
   * Supabase接続テスト
   * GET /node/supabase/test
   */
  async testConnection(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.supabaseService.testConnection();

      if (result.success) {
        res.status(200).json({
          status: 'success',
          message: result.message,
          result: result.result,
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: result.message,
          error: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        message: 'Failed to test Supabase connection',
        error: errorMessage,
      });
    }
  }
}
