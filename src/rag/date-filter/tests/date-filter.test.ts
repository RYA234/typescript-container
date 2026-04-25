import { DateFilterService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('DateFilterService', () => {
  let service: DateFilterService;

  beforeEach(() => {
    service = new DateFilterService();
  });

  describe('ingestDocument', () => {
    it('日付付きでドキュメントを登録できる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.ingestDocument('就業規則の改定内容', '2026-03-01', '就業規則 2026年改定');

      expect(result.success).toBe(true);
      expect(result.documentDate).toBe('2026-03-01');
      expect(result.title).toBe('就業規則 2026年改定');
      expect(result.chunkCount).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('タイトルなしでも登録できる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.ingestDocument('議事録の内容', '2026-01-15');

      expect(result.success).toBe(true);
      expect(result.documentDate).toBe('2026-01-15');
      expect(result.title).toBeUndefined();
    });
  });

  describe('queryWithDateRange', () => {
    it('日付範囲内のドキュメントのみ検索する', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockData = [
        { id: 'uuid-1', content: '有給休暇は年間10日付与', title: '就業規則 2026年改定', document_date: '2026-03-01', similarity: 0.93 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('2026年改定の就業規則では、有給休暇は年間10日付与されます。');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithDateRange('有給ルールは？', '2026-01-01', '2026-12-31');

      expect(result.dateRange).toEqual({ from: '2026-01-01', to: '2026-12-31' });
      expect(result.answer).toContain('有給休暇');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].documentDate).toBe('2026-03-01');
      expect(result.sources[0].title).toBe('就業規則 2026年改定');
      expect(result.sources[0].similarity).toBe(0.93);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('範囲外のドキュメントは返さない（RPCが日付で絞り込む）', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithDateRange('有給ルールは？', '2025-01-01', '2025-12-31');

      expect(result.sources).toHaveLength(0);
      expect(result.answer).toBe('指定した期間内に該当するドキュメントが見つかりませんでした。');

      const rpcCall = mockRpc.mock.calls[0][1] as { date_from: string; date_to: string };
      expect(rpcCall.date_from).toBe('2025-01-01');
      expect(rpcCall.date_to).toBe('2025-12-31');
    });

    it('複数ドキュメントが返る場合もsourcesに全件含まれる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockData = [
        { id: 'uuid-1', content: '2月の議事録', title: '2月会議', document_date: '2026-02-01', similarity: 0.88 },
        { id: 'uuid-2', content: '3月の議事録', title: '3月会議', document_date: '2026-03-01', similarity: 0.82 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('2月・3月の議事録によると...');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithDateRange('最近の会議内容は？', '2026-02-01', '2026-03-31');

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].documentDate).toBe('2026-02-01');
      expect(result.sources[1].documentDate).toBe('2026-03-01');
    });
  });

  describe('deleteAllDocuments', () => {
    it('全件削除できる', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        neq: jest.fn().mockResolvedValue({ count: 5, error: null }),
      });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.deleteAllDocuments();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
      expect(result.message).toContain('5件');
    });
  });
});
