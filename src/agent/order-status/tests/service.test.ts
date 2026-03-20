import { OrderStatusService } from '../service';

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      startChat: jest.fn(() => ({ sendMessage: jest.fn() })),
    })),
  }));
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    SchemaType: { OBJECT: 'object', STRING: 'string' },
  };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('OrderStatusService', () => {
  let service: OrderStatusService;

  beforeEach(() => {
    service = new OrderStatusService();
  });

  describe('callTool', () => {
    it('get_order_status: 既存注文のステータスを返す', () => {
      expect(service.callTool('get_order_status', { orderId: 'ORD-001' })).toBe('配送中');
    });

    it('get_order_status: 存在しない注文はエラーメッセージを返す', () => {
      const result = service.callTool('get_order_status', { orderId: 'ORD-999' });
      expect(result).toContain('見つかりません');
    });

    it('get_estimated_delivery: 配送予定日を返す', () => {
      expect(service.callTool('get_estimated_delivery', { orderId: 'ORD-002' })).toBe('2025-12-28');
    });

    it('get_estimated_delivery: キャンセル注文は予定日なしを返す', () => {
      const result = service.callTool('get_estimated_delivery', { orderId: 'ORD-004' });
      expect(result).toContain('キャンセル');
    });

    it('get_estimated_delivery: 存在しない注文はエラーメッセージを返す', () => {
      const result = service.callTool('get_estimated_delivery', { orderId: 'ORD-999' });
      expect(result).toContain('見つかりません');
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
                candidates: [{ content: { parts: [{ text: '回答です' }] } }],
                text: () => '回答です',
              },
            }),
          }),
        }),
      }));

      const svc = new OrderStatusService();
      const result = await svc.runAgent('ORD-001の状況は？');
      expect(result.reply).toBe('回答です');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('ツール呼び出し後に最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const mockSendMessage = jest.fn()
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ functionCall: { name: 'get_order_status', args: { orderId: 'ORD-001' } } }] } }],
            text: () => '',
          },
        })
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ text: '配送中です' }] } }],
            text: () => '配送中です',
          },
        });

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({ startChat: () => ({ sendMessage: mockSendMessage }) }),
      }));

      const svc = new OrderStatusService();
      const result = await svc.runAgent('ORD-001の状況は？');
      expect(result.reply).toBe('配送中です');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('get_order_status');
    });
  });
});
