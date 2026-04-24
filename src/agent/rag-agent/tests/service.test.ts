import { RagAgentService } from '../service';

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({ startChat: jest.fn() })),
  }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI, SchemaType: { OBJECT: 'object', STRING: 'string' } };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('RagAgentService', () => {
  let service: RagAgentService;

  beforeEach(() => {
    service = new RagAgentService();
  });

  describe('callTool - search_documents', () => {
    it('予算キーワードで関連ドキュメントを返す', () => {
      const result = service.callTool('search_documents', { query: 'プロジェクトX 予算' });
      expect(result).toContain('5,000,000');
      expect(result).toContain('出典:');
    });

    it('有給キーワードで人事ポリシーを返す', () => {
      const result = service.callTool('search_documents', { query: '有給 休暇' });
      expect(result).toContain('10日');
    });

    it('マッチしないクエリはメッセージを返す', () => {
      const result = service.callTool('search_documents', { query: '存在しないキーワードxyz' });
      expect(result).toBe('関連ドキュメントが見つかりませんでした');
    });
  });

  describe('callTool - get_current_date', () => {
    it('日本時間の日付文字列を返す', () => {
      const result = service.callTool('get_current_date', {});
      expect(result).toMatch(/\d{4}/);
    });
  });

  describe('callTool - calculate', () => {
    it('減算を計算する', () => {
      const result = service.callTool('calculate', { expression: '5000000 - 2300000' });
      expect(result).toContain('2,700,000');
    });

    it('加算を計算する', () => {
      const result = service.callTool('calculate', { expression: '1000 + 2000' });
      expect(result).toContain('3,000');
    });

    it('不正な式はエラーを返す', () => {
      const result = service.callTool('calculate', { expression: 'process.exit(1)' });
      expect(result).toContain('計算できない式');
    });

    it('ゼロ除算はエラーを返す', () => {
      const result = service.callTool('calculate', { expression: '1 / 0' });
      expect(result).toContain('ゼロ除算');
    });
  });

  describe('runAgent', () => {
    it('ツールなしで最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          startChat: () => ({
            sendMessage: jest.fn().mockResolvedValue({
              response: {
                candidates: [{ content: { parts: [{ text: 'ご質問ありがとうございます' }] } }],
                text: () => 'ご質問ありがとうございます',
              },
            }),
          }),
        }),
      }));

      const svc = new RagAgentService();
      const result = await svc.runAgent('こんにちは');
      expect(result.reply).toBe('ご質問ありがとうございます');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('search_documents → calculate の連鎖を処理する', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          startChat: () => ({
            sendMessage: jest.fn()
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'search_documents', args: { query: 'プロジェクトX 予算' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'calculate', args: { expression: '5000000 - 2300000' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ text: '残予算は2,700,000円です' }] } }],
                  text: () => '残予算は2,700,000円です',
                },
              }),
          }),
        }),
      }));

      const svc = new RagAgentService();
      const result = await svc.runAgent('プロジェクトXの残予算は？');
      expect(result.reply).toBe('残予算は2,700,000円です');
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0].name).toBe('search_documents');
      expect(result.toolCalls[1].name).toBe('calculate');
    });
  });
});
