import { HybridSearchService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('HybridSearchService', () => {
  let service: HybridSearchService;

  beforeEach(() => {
    service = new HybridSearchService();
    jest.clearAllMocks();
  });

  const mockEmbedding = Array(768).fill(0.1);

  describe('query - vectorモード', () => {
    it('ベクトル検索のみ実行してsourcesを返す', async () => {
      const mockData = [
        { id: 'id-1', content: 'XYZ-300仕様書', rank: 1, similarity: 0.92 },
        { id: 'id-2', content: 'XYZ-300説明書', rank: 2, similarity: 0.85 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('回答です');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.query('XYZ-300の仕様は？', 'vector');

      expect(result.searchMode).toBe('vector');
      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].vectorScore).toBe(0.92);
      expect(result.sources[0].keywordScore).toBeNull();
      expect(mockRpc).toHaveBeenCalledWith('vector_search', expect.any(Object));
    });
  });

  describe('query - keywordモード', () => {
    it('キーワード検索のみ実行してsourcesを返す', async () => {
      const mockData = [
        { id: 'id-1', content: 'XYZ-300仕様書', rank: 1 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('回答です');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.query('XYZ-300', 'keyword');

      expect(result.searchMode).toBe('keyword');
      expect(result.sources[0].vectorScore).toBeNull();
      expect(result.sources[0].keywordScore).toBeGreaterThan(0);
      expect(mockRpc).toHaveBeenCalledWith('keyword_search', expect.any(Object));
    });
  });

  describe('query - hybridモード', () => {
    it('RRFでスコアを統合して両方ヒットのsourcesを返す', async () => {
      const vectorData = [{ id: 'id-1', content: '共通ドキュメント', rank: 1, similarity: 0.9 }];
      const keywordData = [{ id: 'id-1', content: '共通ドキュメント', rank: 1 }];

      const mockRpc = jest.fn()
        .mockResolvedValueOnce({ data: vectorData, error: null })
        .mockResolvedValueOnce({ data: keywordData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('回答です');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.query('検索クエリ', 'hybrid', 0.5, 0.5);

      expect(result.searchMode).toBe('hybrid');
      expect(result.sources[0].vectorScore).not.toBeNull();
      expect(result.sources[0].keywordScore).not.toBeNull();
      expect(result.sources[0].hybridScore).toBeGreaterThan(result.sources[0].vectorScore!);
    });

    it('ベクトルのみヒットの場合keywordScoreはnull', async () => {
      const vectorData = [{ id: 'id-1', content: 'ベクトルのみ', rank: 1, similarity: 0.8 }];
      const keywordData: unknown[] = [];

      const mockRpc = jest.fn()
        .mockResolvedValueOnce({ data: vectorData, error: null })
        .mockResolvedValueOnce({ data: keywordData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('回答です');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.query('クエリ', 'hybrid');

      expect(result.sources[0].keywordScore).toBeNull();
    });
  });

  describe('deleteAll', () => {
    it('全件削除して件数を返す', async () => {
      const mockNeq = jest.fn().mockResolvedValue({ count: 3, error: null });
      const mockDelete = jest.fn().mockReturnValue({ neq: mockNeq });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.deleteAll();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
    });
  });
});
