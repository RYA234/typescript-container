import { ProductService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    service = new ProductService();
  });

  it('ingestProducts: 商品データを登録できる', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.ingestProducts([
      { name: '防水リュック', description: '軽量素材で防水加工', price: 5800, category: 'バッグ' },
    ]);

    expect(result.success).toBe(true);
    expect(result.registeredCount).toBe(1);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('searchProducts: 類似商品を返す', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockData = [
      { id: 'uuid-1', name: '防水リュック', description: '軽量防水', price: 5800, category: 'バッグ', similarity: 0.91 },
    ];
    const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.searchProducts('軽くて防水のリュック', 3);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].name).toBe('防水リュック');
    expect(result.results[0].similarity).toBe(0.91);
  });

  it('searchProducts: 商品未登録の場合は空配列', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.searchProducts('存在しない商品', 3);

    expect(result.results).toHaveLength(0);
  });
});
