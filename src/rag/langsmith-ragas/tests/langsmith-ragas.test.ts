import { EvalService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');
jest.mock('langsmith', () => ({ Client: jest.fn() }));
jest.mock('langsmith/traceable', () => ({
  traceable: jest.fn((fn: unknown) => fn),
}));

describe('EvalService', () => {
  let service: EvalService;

  beforeEach(() => {
    service = new EvalService();
    jest.clearAllMocks();
  });

  const mockEmbedding = Array(768).fill(0.1);

  describe('queryWithEval', () => {
    it('evaluate=falseのとき評価なしで回答を返す', async () => {
      const mockData = [{ content: '有給休暇は年間20日付与されます。', similarity: 0.9 }];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('有給休暇は年間20日です。');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithEval('有給は何日？', false);

      expect(result.answer).toBe('有給休暇は年間20日です。');
      expect(result.evaluation).toBeNull();
      expect(result.contexts).toHaveLength(1);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('evaluate=trueのとき評価スコアを返す', async () => {
      const mockData = [{ content: '有給休暇は年間20日付与されます。', similarity: 0.9 }];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockScores = { faithfulness: 0.95, answerRelevancy: 0.88, contextPrecision: 0.90, overallScore: 0.91 };

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('有給休暇は年間20日です。');
      jest.spyOn(service as unknown as { evaluateWithRagas: () => Promise<typeof mockScores> }, 'evaluateWithRagas')
        .mockResolvedValue(mockScores);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithEval('有給は何日？', true);

      expect(result.evaluation).not.toBeNull();
      expect(result.evaluation?.faithfulness).toBe(0.95);
      expect(result.evaluation?.overallScore).toBe(0.91);
    });

    it('ソースが見つからない場合は定型文を返しevaluationはnull', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.queryWithEval('存在しない質問', true);

      expect(result.answer).toBe('関連するドキュメントが見つかりませんでした。');
      expect(result.evaluation).toBeNull();
      expect(result.contexts).toHaveLength(0);
    });

    it('RPCエラー時は例外をスローする', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      await expect(service.queryWithEval('test', false)).rejects.toThrow('Supabase RPC error');
    });
  });

  describe('batchEval', () => {
    it('複数テストケースの平均スコアを返す', async () => {
      const scores1 = { faithfulness: 0.9, answerRelevancy: 0.8, contextPrecision: 0.85, overallScore: 0.85 };
      const scores2 = { faithfulness: 0.7, answerRelevancy: 0.6, contextPrecision: 0.65, overallScore: 0.65 };

      jest.spyOn(service, 'queryWithEval')
        .mockResolvedValueOnce({ answer: '回答1', contexts: ['ctx1'], evaluation: scores1, langsmithTraceUrl: null, executionTimeMs: 100 })
        .mockResolvedValueOnce({ answer: '回答2', contexts: ['ctx2'], evaluation: scores2, langsmithTraceUrl: null, executionTimeMs: 120 });

      const result = await service.batchEval([
        { question: '質問1', groundTruth: '答え1' },
        { question: '質問2', groundTruth: '答え2' },
      ]);

      expect(result.results).toHaveLength(2);
      expect(result.averageScores.faithfulness).toBe(0.8);
      expect(result.averageScores.answerRelevancy).toBe(0.7);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
