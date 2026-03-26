import { FaqService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('FaqService', () => {
  let service: FaqService;

  beforeEach(() => {
    service = new FaqService();
  });

  it('ingestFaqs: FAQデータを登録できる', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.ingestFaqs([
      { question: '返品はできますか？', answer: '購入後30日以内であれば返品可能です。', category: '購入' },
    ]);

    expect(result.success).toBe(true);
    expect(result.registeredCount).toBe(1);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('answerFaq: 類似質問に対して回答を返す', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockData = [
      { question: '返品はできますか？', answer: '購入後30日以内であれば返品可能です。', category: '購入', similarity: 0.91 },
    ];
    const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.answerFaq('返品したいんですが');

    expect(result.answer).toBe('購入後30日以内であれば返品可能です。');
    expect(result.matchedQuestion).toBe('返品はできますか？');
    expect(result.similarity).toBe(0.91);
    expect(result.notFound).toBeUndefined();
  });

  it('answerFaq: 類似度が低い場合はnotFound=trueを返す', async () => {
    const mockEmbedding = Array(768).fill(0.1);
    const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

    jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
      .mockResolvedValue(mockEmbedding);
    jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
      rpc: mockRpc,
    } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

    const result = await service.answerFaq('全く関係ない質問');

    expect(result.notFound).toBe(true);
    expect(result.similarity).toBe(0);
    expect(result.matchedQuestion).toBe('');
  });
});
