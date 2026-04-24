import { InquiryRoutingService } from '../service';

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({ startChat: jest.fn() })),
  }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI, SchemaType: { OBJECT: 'object', STRING: 'string' } };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('InquiryRoutingService', () => {
  let service: InquiryRoutingService;

  beforeEach(() => {
    service = new InquiryRoutingService();
  });

  describe('callTool - analyze_inquiry', () => {
    it('配送キーワードを検出する', () => {
      expect(service.callTool('analyze_inquiry', { text: '商品が届かない' })).toBe('配送問題');
      expect(service.callTool('analyze_inquiry', { text: '配送が遅延しています' })).toBe('配送問題');
    });

    it('商品不良キーワードを検出する', () => {
      expect(service.callTool('analyze_inquiry', { text: '商品が壊れていた' })).toBe('商品不良');
      expect(service.callTool('analyze_inquiry', { text: '製品に欠陥がある' })).toBe('商品不良');
    });

    it('請求キーワードを検出する', () => {
      expect(service.callTool('analyze_inquiry', { text: '請求金額が違う' })).toBe('請求・支払い');
      expect(service.callTool('analyze_inquiry', { text: '返金をお願いしたい' })).toBe('請求・支払い');
    });

    it('技術サポートキーワードを検出する', () => {
      expect(service.callTool('analyze_inquiry', { text: 'エラーが発生した' })).toBe('技術サポート');
      expect(service.callTool('analyze_inquiry', { text: 'バグで動かない' })).toBe('技術サポート');
    });

    it('マッチしない場合は一般問い合わせを返す', () => {
      expect(service.callTool('analyze_inquiry', { text: '営業時間を教えてください' })).toBe('一般問い合わせ');
    });
  });

  describe('callTool - get_department', () => {
    it('全カテゴリを正しく部門に変換する', () => {
      expect(service.callTool('get_department', { category: '配送問題' })).toBe('物流部門');
      expect(service.callTool('get_department', { category: '商品不良' })).toBe('品質管理部門');
      expect(service.callTool('get_department', { category: '請求・支払い' })).toBe('経理部門');
      expect(service.callTool('get_department', { category: '技術サポート' })).toBe('ITサポート部門');
      expect(service.callTool('get_department', { category: '一般問い合わせ' })).toBe('カスタマーサポート部門');
    });

    it('未知のカテゴリはカスタマーサポート部門を返す', () => {
      expect(service.callTool('get_department', { category: '不明' })).toBe('カスタマーサポート部門');
    });
  });

  describe('callTool - create_ticket', () => {
    it('TKT-001 から始まる連番IDを発行する', () => {
      const id1 = service.callTool('create_ticket', { content: '問い合わせ1', department: '物流部門' });
      expect(id1).toBe('TKT-001');
    });

    it('連続発行で連番になる', () => {
      service.callTool('create_ticket', { content: '問い合わせ1', department: '物流部門' });
      const id2 = service.callTool('create_ticket', { content: '問い合わせ2', department: '経理部門' });
      expect(id2).toBe('TKT-002');
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
                candidates: [{ content: { parts: [{ text: 'ご連絡ありがとうございます' }] } }],
                text: () => 'ご連絡ありがとうございます',
              },
            }),
          }),
        }),
      }));

      const svc = new InquiryRoutingService();
      const result = await svc.runAgent('こんにちは');
      expect(result.reply).toBe('ご連絡ありがとうございます');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('3ツール連鎖でチケットを作成する', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          startChat: () => ({
            sendMessage: jest.fn()
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'analyze_inquiry', args: { text: '商品が届かない' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'get_department', args: { category: '配送問題' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'create_ticket', args: { content: '商品が届かない', department: '物流部門' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ text: 'チケットTKT-001を作成しました' }] } }],
                  text: () => 'チケットTKT-001を作成しました',
                },
              }),
          }),
        }),
      }));

      const svc = new InquiryRoutingService();
      const result = await svc.runAgent('商品が届かない');
      expect(result.reply).toBe('チケットTKT-001を作成しました');
      expect(result.toolCalls).toHaveLength(3);
      expect(result.toolCalls[0].name).toBe('analyze_inquiry');
      expect(result.toolCalls[1].name).toBe('get_department');
      expect(result.toolCalls[2].name).toBe('create_ticket');
      expect(result.toolCalls[2].result).toBe('TKT-001');
    });
  });
});
