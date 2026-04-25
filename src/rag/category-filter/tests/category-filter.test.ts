import { CategoryFilterService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('CategoryFilterService', () => {
  let service: CategoryFilterService;

  beforeEach(() => {
    service = new CategoryFilterService();
  });

  describe('ingestDocument', () => {
    it('カテゴリ付きでドキュメントを登録できる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.ingestDocument('営業部の経費精算は月5万円以内', 'sales', '営業部');

      expect(result.success).toBe(true);
      expect(result.category).toBe('sales');
      expect(result.chunkCount).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('部門名なしでも登録できる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.ingestDocument('人事規定の内容', 'hr');

      expect(result.success).toBe(true);
      expect(result.category).toBe('hr');
    });
  });

  describe('queryWithFilter', () => {
    it('カテゴリ指定で絞り込み検索できる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockData = [
        { id: 'uuid-1', content: '営業部の経費精算上限は月5万円です', category: 'sales', department: '営業部', similarity: 0.92 },
        { id: 'uuid-2', content: '5万円超は事前申請が必要です', category: 'sales', department: '営業部', similarity: 0.85 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('営業部の経費精算上限は月5万円です。5万円超は事前申請が必要です。');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithFilter('経費精算の上限は？', 'sales');

      expect(result.filteredBy).toBe('sales');
      expect(result.answer).toContain('5万円');
      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].similarity).toBe(0.92);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('別カテゴリのドキュメントは返さない（RPCがカテゴリで絞り込む）', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithFilter('経費精算の上限は？', 'hr');

      expect(result.filteredBy).toBe('hr');
      expect(result.sources).toHaveLength(0);
      expect(result.answer).toBe('該当するドキュメントが見つかりませんでした。');

      const rpcCall = mockRpc.mock.calls[0][1] as { filter_category: string };
      expect(rpcCall.filter_category).toBe('hr');
    });

    it('sourcesに部門情報が含まれる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockData = [
        { id: 'uuid-1', content: '経理部の規定', category: 'accounting', department: '経理部', similarity: 0.88 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('経理部の規定についての回答です。');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithFilter('経理の規定は？', 'accounting');

      expect(result.sources[0].department).toBe('経理部');
      expect(result.sources[0].similarity).toBe(0.88);
    });
  });

  describe('deleteAllDocuments', () => {
    it('全件削除できる', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        neq: jest.fn().mockResolvedValue({ count: 3, error: null }),
      });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.deleteAllDocuments();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.message).toContain('3件');
    });
  });
});
