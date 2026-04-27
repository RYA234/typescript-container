import { ChatHistoryService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');

describe('ChatHistoryService', () => {
  let service: ChatHistoryService;

  beforeEach(() => {
    service = new ChatHistoryService();
    jest.clearAllMocks();
  });

  const mockEmbedding = Array(768).fill(0.1);

  describe('postMessage', () => {
    it('メッセージを投稿してIDを返す', async () => {
      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);

      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'msg-uuid-1' }, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.postMessage('Tanaka', '本番デプロイ完了しました', 'release');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-uuid-1');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('Supabaseエラー時は例外をスローする', async () => {
      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);

      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      await expect(service.postMessage('Tanaka', 'test', 'general')).rejects.toThrow('Supabase insert error');
    });
  });

  describe('getHistory', () => {
    it('会話履歴一覧を返す', async () => {
      const mockData = [
        { id: 'uuid-1', user_name: 'Tanaka', message: 'デプロイ完了', channel: 'release', posted_at: '2026-04-01T10:00:00Z' },
        { id: 'uuid-2', user_name: 'Suzuki', message: 'ありがとうございます', channel: 'release', posted_at: '2026-04-01T10:01:00Z' },
      ];
      const mockLimit = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.getHistory();

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].user).toBe('Tanaka');
      expect(result.messages[0].channel).toBe('release');
    });

    it('チャンネル指定で絞り込みクエリを実行する', async () => {
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit, eq: mockEq });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      await service.getHistory('release');
      expect(mockEq).toHaveBeenCalledWith('channel', 'release');
    });
  });

  describe('searchChatHistory', () => {
    it('類似メッセージを検索して返す', async () => {
      const mockData = [
        { id: 'uuid-1', user_name: 'Tanaka', message: 'デプロイ完了', channel: 'release', posted_at: '2026-04-01T10:00:00Z', similarity: 0.85 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.searchChatHistory('デプロイに関する会話', 'release');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].user).toBe('Tanaka');
      expect(result.results[0].similarity).toBe(0.85);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('ヒットなしの場合は空配列を返す', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.searchChatHistory('存在しないクエリ');

      expect(result.results).toHaveLength(0);
    });
  });
});
