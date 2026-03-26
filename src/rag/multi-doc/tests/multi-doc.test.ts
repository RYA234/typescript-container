import { MultiDocService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('MultiDocService', () => {
  let service: MultiDocService;

  beforeEach(() => {
    service = new MultiDocService();
  });

  it('ingestDocument: 複数タイプのドキュメントを登録できる', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.ingestDocument('就業規則の本文テキスト', 'employment_rules', '就業規則2024');

    expect(result.success).toBe(true);
    expect(result.chunkCount).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('queryMultiDoc: 複数ドキュメントを横断して回答できる', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockData = [
      { id: 'uuid-1', content: '有給休暇は年10日付与されます', document_type: 'employment_rules', title: '就業規則2024', metadata: {}, similarity: 0.92 },
      { id: 'uuid-2', content: '申請はシステムから行ってください', document_type: 'manual', title: '操作マニュアル', metadata: {}, similarity: 0.80 },
    ];
    const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
      .mockResolvedValue('有給休暇は年10日付与されます（就業規則より）。申請はシステムから行ってください（マニュアルより）。');
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.queryMultiDoc('有給休暇の申請方法は？');

    expect(result.answer).toContain('有給休暇');
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].documentType).toBe('employment_rules');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('queryMultiDoc: sourcesに参照元ドキュメントタイプが含まれる', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockData = [
      { id: 'uuid-1', content: '議事録の内容', document_type: 'minutes', title: '2024年1月会議', metadata: {}, similarity: 0.75 },
    ];
    const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
      .mockResolvedValue('議事録によると、会議の内容は以下の通りです。');
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.queryMultiDoc('1月の会議の内容は？');

    expect(result.sources[0].documentType).toBe('minutes');
    expect(result.sources[0].title).toBe('2024年1月会議');
    expect(result.sources[0].similarity).toBe(0.75);
  });
});
