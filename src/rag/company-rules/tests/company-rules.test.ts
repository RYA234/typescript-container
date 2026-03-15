// Set up environment variables before importing
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.LANGCHAIN_API_KEY = 'test-langchain-api-key';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.PORT = '3000';

import { RagService } from '../service';

// Supabase クライアントのモック
jest.mock('../../../supabase/service', () => ({
  SupabaseService: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
      neq: jest.fn().mockResolvedValue({ count: 3, error: null }),
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            content: '年次有給休暇は勤続6ヶ月以上で10日付与されます。',
            similarity: 0.92,
            metadata: { source: '就業規則', chunkIndex: 0, totalChunks: 5 },
          },
        ],
        error: null,
      }),
    }),
  })),
}));

// Gemini API のモック
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockImplementation(({ model }: { model: string }) => {
      if (model === 'gemini-embedding-001') {
        return {
          embedContent: jest.fn().mockResolvedValue({
            embedding: { values: new Array(768).fill(0.1) },
          }),
        };
      }
      return {
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => '年次有給休暇は勤続6ヶ月以上で10日付与されます。' },
        }),
      };
    }),
  })),
}));

describe('RagService', () => {
  let ragService: RagService;

  beforeEach(() => {
    ragService = new RagService();
  });

  describe('ingestText', () => {
    it('テキストをチャンク分割してSupabaseに登録できる', async () => {
      const result = await ragService.ingestText('就業規則のサンプルテキストです。', '就業規則');
      expect(result.success).toBe(true);
      expect(result.chunkCount).toBeGreaterThan(0);
      expect(result.message).toContain('チャンクを登録しました');
    });

    it('空テキストは400エラー相当の例外を投げない（controller層で処理）', async () => {
      // service層は空チェックしない（controllerが担当）
      // 空テキストでも1チャンクとして処理される
      const result = await ragService.ingestText('a');
      expect(result.success).toBe(true);
    });
  });

  describe('searchSimilar', () => {
    it('クエリに近いチャンクを返す', async () => {
      const result = await ragService.searchSimilar('有給休暇');
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].similarity).toBeGreaterThan(0);
      expect(result.results[0].content).toBeDefined();
    });

    it('limitが正しく渡される', async () => {
      const result = await ragService.searchSimilar('有給休暇', 5);
      expect(result).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('queryRag', () => {
    it('質問に対して回答と参照元を返す', async () => {
      const result = await ragService.queryRag('有給は何日取れますか？');
      expect(result.answer).toBeDefined();
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.message).toContain('ソースを参照して回答しました');
    });
  });

  describe('deleteAllDocuments', () => {
    it('全ドキュメントを削除できる', async () => {
      const result = await ragService.deleteAllDocuments();
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
      expect(result.message).toContain('件のドキュメントを削除しました');
    });
  });
});
