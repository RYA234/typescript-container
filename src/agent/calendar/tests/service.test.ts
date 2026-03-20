import { CalendarAgentService } from '../service';

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

describe('CalendarAgentService', () => {
  let service: CalendarAgentService;

  beforeEach(() => {
    service = new CalendarAgentService();
  });

  describe('getDayOfWeek', () => {
    it('2025-01-01 は水曜日', () => {
      expect(service.getDayOfWeek('2025-01-01')).toBe('水曜日');
    });

    it('2025-01-04 は土曜日', () => {
      expect(service.getDayOfWeek('2025-01-04')).toBe('土曜日');
    });

    it('無効な日付はエラーメッセージを返す', () => {
      expect(service.getDayOfWeek('invalid')).toBe('無効な日付です');
    });
  });

  describe('isHoliday', () => {
    it('2025-01-01 は元日', () => {
      expect(service.isHoliday('2025-01-01')).toBe('元日');
    });

    it('2025-01-02 は祝日ではない', () => {
      expect(service.isHoliday('2025-01-02')).toBe('祝日ではありません');
    });
  });

  describe('calcBusinessDays', () => {
    it('2025-01-01 から 2025-01-10 の営業日数', () => {
      // 1/1(祝)、1/2(木)、1/3(金)、1/4(土)、1/5(日)、1/6(月)、1/7(火)、1/8(水)、1/9(木)、1/10(金)
      // 営業日: 1/2, 1/3, 1/6, 1/7, 1/8, 1/9, 1/10 = 7日
      expect(service.calcBusinessDays('2025-01-01', '2025-01-10')).toBe('7');
    });

    it('無効な日付はエラーメッセージを返す', () => {
      expect(service.calcBusinessDays('invalid', '2025-01-10')).toBe('無効な日付です');
    });
  });

  describe('runAgent', () => {
    it('ツール呼び出し後に最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const mockSendMessage = jest.fn()
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ functionCall: { name: 'get_day_of_week', args: { date: '2025-01-01' } } }] } }],
            text: () => '',
          },
        })
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ text: '2025年1月1日は水曜日です' }] } }],
            text: () => '2025年1月1日は水曜日です',
          },
        });

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({ startChat: () => ({ sendMessage: mockSendMessage }) }),
      }));

      const svc = new CalendarAgentService();
      const result = await svc.runAgent('2025-01-01は何曜日？');
      expect(result.reply).toBe('2025年1月1日は水曜日です');
      expect(result.toolCalls).toHaveLength(1);
    });
  });
});
