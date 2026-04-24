import { CreditCheckAgentService } from '../service';

jest.mock('@google/generative-ai', () => {
  const mockSendMessage = jest.fn();
  const mockStartChat = jest.fn(() => ({ sendMessage: mockSendMessage }));
  const mockGetGenerativeModel = jest.fn(() => ({ startChat: mockStartChat }));
  const MockGoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI, SchemaType: { OBJECT: 'object', STRING: 'string', NUMBER: 'number' } };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('CreditCheckAgentService', () => {
  let service: CreditCheckAgentService;

  beforeEach(() => {
    service = new CreditCheckAgentService();
  });

  describe('callTool - validate_company', () => {
    it('既知の有効な会社はvalidを返す', () => {
      const result = service.callTool('validate_company', { companyName: '株式会社サンプル' });
      expect(result).toEqual({ result: 'valid' });
    });

    it('isValid=falseの会社はinvalidを返す', () => {
      const result = service.callTool('validate_company', { companyName: '架空企業' });
      expect(result).toEqual({ result: 'invalid: 存在しない会社です' });
    });

    it('会社名が1文字以下はinvalidを返す', () => {
      const result = service.callTool('validate_company', { companyName: 'A' });
      expect(result).toEqual({ result: 'invalid: 会社名が短すぎます' });
    });

    it('空文字はinvalidを返す', () => {
      const result = service.callTool('validate_company', { companyName: '' });
      expect(result).toEqual({ result: 'invalid: 会社名が短すぎます' });
    });

    it('DB未登録の会社はvalidを返す', () => {
      const result = service.callTool('validate_company', { companyName: '未登録株式会社' });
      expect(result).toEqual({ result: 'valid' });
    });
  });

  describe('callTool - score_credit', () => {
    it('既知の会社はDBのスコアを返す', () => {
      const result = service.callTool('score_credit', { companyName: '株式会社サンプル' });
      expect(result).toEqual({ score: 75 });
    });

    it('DB未登録の会社は固定値50を返す', () => {
      const result = service.callTool('score_credit', { companyName: '未登録株式会社' });
      expect(result).toEqual({ score: 50 });
    });
  });

  describe('callTool - judge_credit', () => {
    it('スコア80以上は優良承認', () => {
      const result = service.callTool('judge_credit', { score: 85 });
      expect(result).toEqual({ judgment: '優良承認' });
    });

    it('スコア60〜79は承認', () => {
      const result = service.callTool('judge_credit', { score: 75 });
      expect(result).toEqual({ judgment: '承認' });
    });

    it('スコア40〜59は条件付き承認', () => {
      const result = service.callTool('judge_credit', { score: 55 });
      expect(result).toEqual({ judgment: '条件付き承認' });
    });

    it('スコア39以下は否認', () => {
      const result = service.callTool('judge_credit', { score: 30 });
      expect(result).toEqual({ judgment: '否認' });
    });

    it('境界値：スコア80は優良承認', () => {
      const result = service.callTool('judge_credit', { score: 80 });
      expect(result).toEqual({ judgment: '優良承認' });
    });

    it('境界値：スコア60は承認', () => {
      const result = service.callTool('judge_credit', { score: 60 });
      expect(result).toEqual({ judgment: '承認' });
    });

    it('境界値：スコア40は条件付き承認', () => {
      const result = service.callTool('judge_credit', { score: 40 });
      expect(result).toEqual({ judgment: '条件付き承認' });
    });
  });

  describe('runAgent', () => {
    it('ツールなしで最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const mockSendMessage = jest.fn().mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: '回答です' }] } }],
          text: () => '回答です',
        },
      });
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({ startChat: () => ({ sendMessage: mockSendMessage }) }),
      }));

      const svc = new CreditCheckAgentService();
      const result = await svc.runAgent('株式会社サンプルの与信チェックをお願いします');
      expect(result.answer).toBe('回答です');
      expect(result.toolsUsed).toHaveLength(0);
    });

    it('ツール呼び出し後に最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const mockSendMessage = jest
        .fn()
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ functionCall: { name: 'validate_company', args: { companyName: '株式会社サンプル' } } }] } }],
            text: () => '',
          },
        })
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ text: 'バリデーションOKです' }] } }],
            text: () => 'バリデーションOKです',
          },
        });

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({ startChat: () => ({ sendMessage: mockSendMessage }) }),
      }));

      const svc = new CreditCheckAgentService();
      const result = await svc.runAgent('株式会社サンプルの与信チェックをお願いします');
      expect(result.answer).toBe('バリデーションOKです');
      expect(result.toolsUsed).toHaveLength(1);
      expect(result.toolsUsed[0].name).toBe('validate_company');
    });
  });
});
