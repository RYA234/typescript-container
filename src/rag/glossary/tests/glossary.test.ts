import { GlossaryService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('GlossaryService', () => {
  let service: GlossaryService;

  beforeEach(() => {
    service = new GlossaryService();
  });

  it('ingestTerms: 用語データを登録できる', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.ingestTerms([
      { term: 'YMS', definition: '倉庫管理システム（Yard Management System）', category: 'システム' },
    ]);

    expect(result.success).toBe(true);
    expect(result.registeredCount).toBe(1);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('searchGlossary: 略語でも類似用語を返す', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockData = [
      { id: 'uuid-1', term: 'YMS', definition: '倉庫管理システム', category: 'システム', similarity: 0.95 },
      { id: 'uuid-2', term: 'WMS', definition: '倉庫管理システム（Warehouse Management）', category: 'システム', similarity: 0.71 },
    ];
    const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.searchGlossary('YMSって何？', 5);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].term).toBe('YMS');
    expect(result.results[0].similarity).toBe(0.95);
  });

  it('searchGlossary: 未登録の用語は空配列を返す', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.searchGlossary('存在しない用語', 5);

    expect(result.results).toHaveLength(0);
  });
});
