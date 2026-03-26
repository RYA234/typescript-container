import { RecipeService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('RecipeService', () => {
  let service: RecipeService;

  beforeEach(() => {
    service = new RecipeService();
  });

  it('ingestRecipes: レシピを登録できる', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.ingestRecipes([
      { name: '親子丼', ingredients: ['鶏もも肉', '玉ねぎ', '卵'], timeMinutes: 15, description: '卵でとじたふわとろ丼' },
    ]);

    expect(result.success).toBe(true);
    expect(result.registeredCount).toBe(1);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('suggestRecipes: 食材名で類似レシピを返す', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockData = [
      { id: 'uuid-1', name: '親子丼', ingredients: ['鶏もも肉', '玉ねぎ', '卵'], time_minutes: 15, description: '卵でとじたふわとろ丼', similarity: 0.92 },
      { id: 'uuid-2', name: '鶏の唐揚げ', ingredients: ['鶏もも肉', '醤油', '生姜'], time_minutes: 20, description: 'カリッとジューシーな定番唐揚げ', similarity: 0.75 },
    ];
    const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.suggestRecipes('鶏肉と玉ねぎで作れる料理');

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].name).toBe('親子丼');
    expect(result.suggestions[0].similarity).toBe(0.92);
  });

  it('suggestRecipes: 該当レシピがない場合は空配列を返す', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.suggestRecipes('存在しない食材XXXXXX');

    expect(result.suggestions).toHaveLength(0);
  });
});
