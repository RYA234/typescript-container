import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../shared/config';
import { SupabaseConnectionTestResult } from '../interfaces';

/**
 * Supabaseサービス
 * Supabaseとの接続とデータベース操作を提供
 */
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }

  /**
   * Supabase接続テスト
   * SELECT 1 を実行して接続を確認
   */
  async testConnection(): Promise<SupabaseConnectionTestResult> {
    try {
      const { data, error } = await this.supabase.rpc('test_connection', {});

      if (error) {
        // RPCが存在しない場合は、直接SQLを実行する代替案を試す
        // これは開発/テスト用です
        console.log('RPC function not found, testing with basic query');

        // 代わりにシステムテーブルから簡単なクエリを実行
        const { error: testError } = await this.supabase
          .from('_test')
          .select('*')
          .limit(1);

        if (testError && testError.message.includes('relation "_test" does not exist')) {
          // テーブルが存在しないのは正常（接続は成功）
          return {
            success: true,
            message: 'Supabase connection successful (basic connectivity test)',
            result: 1,
          };
        }

        if (testError) {
          throw testError;
        }
      }

      return {
        success: true,
        message: 'Supabase connection successful',
        result: data || 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: 'Supabase connection failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Supabaseクライアントを取得
   * 他のモジュールで使用するため
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }
}
