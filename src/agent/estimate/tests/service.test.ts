import { EstimateAgentService } from '../service';

jest.mock('@google/generative-ai', () => {
  const mockSendMessage = jest.fn();
  const mockStartChat = jest.fn(() => ({ sendMessage: mockSendMessage }));
  const mockGetGenerativeModel = jest.fn(() => ({ startChat: mockStartChat }));
  const MockGoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI, SchemaType: { OBJECT: 'object', STRING: 'string', NUMBER: 'number', ARRAY: 'array' } };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('EstimateAgentService', () => {
  let service: EstimateAgentService;

  beforeEach(() => {
    service = new EstimateAgentService();
  });

  describe('callTool - search_product', () => {
    it('既知の商品情報を返す', () => {
      const result = service.callTool('search_product', { productName: 'ノートパソコン' });
      expect(result).toEqual({ id: 'PC-001', name: 'ノートパソコン', price: 120000, unit: '台' });
    });

    it('存在しない商品はエラーを返す', () => {
      const result = service.callTool('search_product', { productName: '存在しない商品' });
      expect(result).toHaveProperty('error');
    });
  });

  describe('callTool - calc_subtotal', () => {
    it('商品IDと数量から小計を計算する', () => {
      const result = service.callTool('calc_subtotal', { productId: 'PC-001', quantity: 2 });
      expect(result).toMatchObject({ productName: 'ノートパソコン', quantity: 2, unitPrice: 120000, subtotal: 240000 });
    });

    it('数量0のとき小計は0', () => {
      const result = service.callTool('calc_subtotal', { productId: 'ACC-001', quantity: 0 });
      expect(result).toMatchObject({ subtotal: 0 });
    });

    it('存在しない商品IDはエラーを返す', () => {
      const result = service.callTool('calc_subtotal', { productId: 'UNKNOWN', quantity: 1 });
      expect(result).toHaveProperty('error');
    });
  });

  describe('callTool - generate_quote', () => {
    it('1明細の見積書を生成する', () => {
      const items = [JSON.stringify({ productName: 'マウス', quantity: 3, unitPrice: 2500, subtotal: 7500 })];
      const result = service.callTool('generate_quote', { items });
      expect(result).toHaveProperty('quote');
      expect(result).toHaveProperty('total', 7500);
      expect((result['quote'] as string)).toContain('マウス');
      expect((result['quote'] as string)).toContain('7,500');
    });

    it('複数明細の合計を正しく計算する', () => {
      const items = [
        JSON.stringify({ productName: 'ノートパソコン', quantity: 2, unitPrice: 120000, subtotal: 240000 }),
        JSON.stringify({ productName: 'マウス', quantity: 3, unitPrice: 2500, subtotal: 7500 }),
      ];
      const result = service.callTool('generate_quote', { items });
      expect(result).toHaveProperty('total', 247500);
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

      const svc = new EstimateAgentService();
      const result = await svc.runAgent('モニターを2台');
      expect(result.answer).toBe('回答です');
      expect(result.toolsUsed).toHaveLength(0);
    });

    it('ツール呼び出し後に最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const mockSendMessage = jest
        .fn()
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ functionCall: { name: 'search_product', args: { productName: 'モニター' } } }] } }],
            text: () => '',
          },
        })
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ text: 'モニター2台の見積もりです' }] } }],
            text: () => 'モニター2台の見積もりです',
          },
        });

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({ startChat: () => ({ sendMessage: mockSendMessage }) }),
      }));

      const svc = new EstimateAgentService();
      const result = await svc.runAgent('モニターを2台');
      expect(result.answer).toBe('モニター2台の見積もりです');
      expect(result.toolsUsed).toHaveLength(1);
      expect(result.toolsUsed[0].name).toBe('search_product');
    });
  });
});
