/**
 * Supabase関連の型定義
 */

/**
 * Supabase接続テスト結果
 */
export interface SupabaseConnectionTestResult {
  success: boolean;
  message: string;
  result?: number;
  error?: string;
}
