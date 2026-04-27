import { ScoredService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('ScoredService', () => {
  let service: ScoredService;

  beforeEach(() => {
    service = new ScoredService();
    jest.clearAllMocks();
  });

  const mockEmbedding = Array(768).fill(0.1);

  describe('ingest', () => {
    it('テキストをチャンク分割して登録し結果を返す', async () => {
      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.ingest('テスト文書です。', 'test-source');

      expect(result.success).toBe(true);
      expect(result.chunkCount).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('Supabaseエラー時は例外をスローする', async () => {
      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);

      const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'insert failed' } });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      await expect(service.ingest('test')).rejects.toThrow('Supabase insert error');
    });
  });

  describe('queryWithScore', () => {
    it('高スコアのソースがある場合はHIGH信頼度で返す', async () => {
      const mockData = [
        { content: '有給休暇は年間20日付与されます。', similarity: 0.9, metadata: { source: 'hr-rules' } },
        { content: '勤続1年未満は10日。', similarity: 0.87, metadata: { source: 'hr-rules' } },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('有給休暇は年間20日付与されます。');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithScore('有給休暇は何日？');

      expect(result.confidence).toBe('HIGH');
      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].confidenceLevel).toBe('HIGH');
      expect(result.sources[0].documentTitle).toBe('hr-rules');
      expect(result.warning).toBeNull();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('中スコアのソースがある場合はMEDIUM信頼度で返す', async () => {
      const mockData = [
        { content: '関連情報です。', similarity: 0.75, metadata: { source: 'doc' } },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('回答です。');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithScore('質問です');

      expect(result.confidence).toBe('MEDIUM');
      expect(result.sources[0].confidenceLevel).toBe('MEDIUM');
      expect(result.warning).toBeNull();
    });

    it('ソースが見つからない場合はLOW信頼度と警告を返す', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithScore('存在しない情報');

      expect(result.confidence).toBe('LOW');
      expect(result.sources).toHaveLength(0);
      expect(result.warning).not.toBeNull();
      expect(result.answer).toBe('関連するドキュメントが見つかりませんでした。');
    });

    it('RPCエラー時は例外をスローする', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      await expect(service.queryWithScore('test')).rejects.toThrow('Supabase RPC error');
    });
  });

  describe('deleteAll', () => {
    it('全件削除して件数を返す', async () => {
      const mockNeq = jest.fn().mockResolvedValue({ count: 5, error: null });
      const mockDelete = jest.fn().mockReturnValue({ neq: mockNeq });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.deleteAll();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
      expect(result.message).toContain('5件');
    });
  });
});
