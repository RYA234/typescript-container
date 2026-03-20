import { BasicAgentService } from '../service';

jest.mock('@google/generative-ai');

describe('BasicAgentService', () => {
  let service: BasicAgentService;

  beforeEach(() => {
    service = new BasicAgentService();
  });

  describe('callTool', () => {
    it('get_weather: 登録済み都市の天気を返す', () => {
      const result = service.callTool('get_weather', { city: '東京' });
      expect(result).toBe('晴れ, 22°C');
    });

    it('get_weather: 未登録都市はフォールバックメッセージを返す', () => {
      const result = service.callTool('get_weather', { city: 'ロンドン' });
      expect(result).toContain('取得できませんでした');
    });

    it('calculate: 四則演算の結果を返す', () => {
      expect(service.callTool('calculate', { expression: '3 + 5 * 2' })).toBe('13');
      expect(service.callTool('calculate', { expression: '100 / 4' })).toBe('25');
    });

    it('calculate: 不正な式はエラーメッセージを返す', () => {
      const result = service.callTool('calculate', { expression: 'invalid!!' });
      expect(result).toBe('計算できませんでした');
    });

    it('get_current_time: ISO 8601形式の日時を返す', () => {
      const result = service.callTool('get_current_time', {});
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('runAgent', () => {
    it('Function Callなしの応答を正しく処理する', async () => {
      const mockText = jest.fn().mockReturnValue('こんにちは！');
      const mockSendMessage = jest.fn().mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: 'こんにちは！' }] } }],
          text: mockText,
        },
      });
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      jest.spyOn(service['genAI'], 'getGenerativeModel').mockReturnValue({
        startChat: mockStartChat,
      } as unknown as ReturnType<typeof service['genAI']['getGenerativeModel']>);

      const result = await service.runAgent('こんにちは');
      expect(result.reply).toBe('こんにちは！');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('Function Callありの応答でツールを実行する', async () => {
      const mockText = jest.fn().mockReturnValue('東京の天気は晴れ、22°Cです。');
      let callCount = 0;
      const mockSendMessage = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            response: {
              candidates: [{
                content: { parts: [{ functionCall: { name: 'get_weather', args: { city: '東京' } } }] },
              }],
              text: mockText,
            },
          });
        }
        return Promise.resolve({
          response: {
            candidates: [{ content: { parts: [{ text: '東京の天気は晴れ、22°Cです。' }] } }],
            text: mockText,
          },
        });
      });

      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      jest.spyOn(service['genAI'], 'getGenerativeModel').mockReturnValue({
        startChat: mockStartChat,
      } as unknown as ReturnType<typeof service['genAI']['getGenerativeModel']>);

      const result = await service.runAgent('東京の天気を教えて');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('get_weather');
      expect(result.toolCalls[0].result).toBe('晴れ, 22°C');
    });
  });
});
