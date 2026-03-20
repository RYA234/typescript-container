import { InventoryAgentService } from '../service';

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

describe('InventoryAgentService', () => {
  let service: InventoryAgentService;

  beforeEach(() => {
    service = new InventoryAgentService();
  });

  describe('callTool', () => {
    it('get_stock: 既存商品の在庫を返す', () => {
      const result = service.callTool('get_stock', { productName: '商品A' });
      expect(result).toEqual({ productName: '商品A', stock: 120, unit: '個' });
    });

    it('get_stock: 存在しない商品はエラーを返す', () => {
      const result = service.callTool('get_stock', { productName: '商品Z' });
      expect(result).toHaveProperty('error');
    });

    it('get_price: 既存商品の単価を返す', () => {
      const result = service.callTool('get_price', { productName: '商品B' });
      expect(result).toEqual({ productName: '商品B', price: 3200, unit: '円' });
    });

    it('get_price: 存在しない商品はエラーを返す', () => {
      const result = service.callTool('get_price', { productName: '商品Z' });
      expect(result).toHaveProperty('error');
    });

    it('calculate_total: 数量×単価の合計を返す', () => {
      const result = service.callTool('calculate_total', { quantity: 5, price: 1500 });
      expect(result).toEqual({ total: 7500, unit: '円' });
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

      const svc = new InventoryAgentService();
      const result = await svc.runAgent('商品Aの在庫は？');
      expect(result.answer).toBe('回答です');
      expect(result.toolsUsed).toHaveLength(0);
    });

    it('ツール呼び出し後に最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const mockSendMessage = jest
        .fn()
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ functionCall: { name: 'get_stock', args: { productName: '商品A' } } }] } }],
            text: () => '',
          },
        })
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ text: '在庫は120個です' }] } }],
            text: () => '在庫は120個です',
          },
        });

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({ startChat: () => ({ sendMessage: mockSendMessage }) }),
      }));

      const svc = new InventoryAgentService();
      const result = await svc.runAgent('商品Aの在庫は？');
      expect(result.answer).toBe('在庫は120個です');
      expect(result.toolsUsed).toHaveLength(1);
      expect(result.toolsUsed[0].name).toBe('get_stock');
    });
  });
});
