import { DataAggregationService } from '../service';

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({ startChat: jest.fn() })),
  }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI, SchemaType: { OBJECT: 'object', STRING: 'string' } };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('DataAggregationService', () => {
  let service: DataAggregationService;

  beforeEach(() => {
    service = new DataAggregationService();
  });

  describe('callTool - get_sales', () => {
    it('存在する月の売上データを返す', () => {
      const result = service.callTool('get_sales', { period: '2025-01' });
      const data = JSON.parse(result);
      expect(data.period).toBe('2025-01');
      expect(data.totalAmount).toBe(1250000);
      expect(data.prevMonthRatio).toBe(1.05);
    });

    it('2025-02のデータを返す', () => {
      const result = service.callTool('get_sales', { period: '2025-02' });
      const data = JSON.parse(result);
      expect(data.totalAmount).toBe(980000);
      expect(data.prevMonthRatio).toBe(0.78);
    });

    it('存在しない月はエラーを返す', () => {
      const result = service.callTool('get_sales', { period: '2099-01' });
      const data = JSON.parse(result);
      expect(data.error).toContain('2099-01');
    });
  });

  describe('callTool - get_inventory', () => {
    it('全商品の在庫データを返す', () => {
      const result = service.callTool('get_inventory', {});
      const data = JSON.parse(result);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(5);
    });

    it('ノートパソコンの在庫が含まれる', () => {
      const result = service.callTool('get_inventory', {});
      const data = JSON.parse(result);
      const pc = data.find((item: { productName: string }) => item.productName === 'ノートパソコン');
      expect(pc).toBeDefined();
      expect(pc.stock).toBe(20);
      expect(pc.turnoverRate).toBe(2.3);
    });
  });

  describe('callTool - generate_report', () => {
    it('売上・在庫データからレポートを生成する', () => {
      const salesData = JSON.stringify({
        period: '2025-01', totalAmount: 1250000, prevMonthRatio: 1.05,
        topProducts: [{ name: 'ノートパソコン', amount: 600000 }],
      });
      const inventoryData = JSON.stringify([
        { productName: 'ノートパソコン', stock: 20, unit: '台', turnoverRate: 2.3 },
      ]);
      const result = service.callTool('generate_report', { salesData, inventoryData });
      expect(result).toContain('2025年01月');
      expect(result).toContain('1,250,000');
      expect(result).toContain('+5%');
      expect(result).toContain('ノートパソコン');
    });

    it('前月比マイナスの場合も正しく表示する', () => {
      const salesData = JSON.stringify({
        period: '2025-02', totalAmount: 980000, prevMonthRatio: 0.78,
        topProducts: [],
      });
      const inventoryData = JSON.stringify([]);
      const result = service.callTool('generate_report', { salesData, inventoryData });
      expect(result).toContain('-22%');
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
                candidates: [{ content: { parts: [{ text: 'レポートを作成しました' }] } }],
                text: () => 'レポートを作成しました',
              },
            }),
          }),
        }),
      }));

      const svc = new DataAggregationService();
      const result = await svc.runAgent('売上を教えてください');
      expect(result.reply).toBe('レポートを作成しました');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('get_sales → get_inventory → generate_report の連鎖を処理する', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          startChat: () => ({
            sendMessage: jest.fn()
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'get_sales', args: { period: '2025-01' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'get_inventory', args: {} } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'generate_report', args: { salesData: '{}', inventoryData: '[]' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ text: '月次レポートを生成しました' }] } }],
                  text: () => '月次レポートを生成しました',
                },
              }),
          }),
        }),
      }));

      const svc = new DataAggregationService();
      const result = await svc.runAgent('2025年1月のレポートを作成してください');
      expect(result.reply).toBe('月次レポートを生成しました');
      expect(result.toolCalls).toHaveLength(3);
      expect(result.toolCalls[0].name).toBe('get_sales');
      expect(result.toolCalls[1].name).toBe('get_inventory');
      expect(result.toolCalls[2].name).toBe('generate_report');
    });
  });
});
