import { AttendanceService } from '../service';

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

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    service = new AttendanceService();
  });

  describe('callTool - record_attendance', () => {
    it('新規勤怠を記録する', () => {
      const result = service.callTool('record_attendance', { userId: '山田', type: '出勤', date: '2025-02-01' });
      expect(result).toContain('山田さんの2025-02-01の出勤を記録しました');
    });

    it('同一日・同一種別を上書きする', () => {
      service.callTool('record_attendance', { userId: '田中', type: '出勤', date: '2025-01-06' });
      const result = service.callTool('record_attendance', { userId: '田中', type: '出勤', date: '2025-01-06' });
      expect(result).toContain('2025-01-06');
    });

    it('有給を記録できる', () => {
      const result = service.callTool('record_attendance', { userId: '田中', type: '有給', date: '2025-02-10' });
      expect(result).toContain('有給');
    });
  });

  describe('callTool - get_attendance', () => {
    it('特定日の勤怠を取得する', () => {
      const result = service.callTool('get_attendance', { userId: '田中', date: '2025-01-06' });
      expect(result).toContain('2025-01-06');
      expect(result).toContain('出勤');
      expect(result).toContain('退勤');
    });

    it('月単位の勤怠一覧を取得する', () => {
      const result = service.callTool('get_attendance', { userId: '田中', date: '2025-01' });
      expect(result).toContain('2025-01-06');
      expect(result).toContain('2025-01-07');
    });

    it('記録なしの場合はメッセージを返す', () => {
      const result = service.callTool('get_attendance', { userId: '存在しない人', date: '2025-01-01' });
      expect(result).toContain('記録はありません');
    });
  });

  describe('callTool - calc_overtime', () => {
    it('田中の1月残業時間を計算する', () => {
      const result = service.callTool('calc_overtime', { userId: '田中', month: '2025-01' });
      expect(result).toContain('田中さんの2025-01の残業時間は');
      expect(result).toMatch(/\d+時間\d+分/);
    });

    it('残業のないユーザーは0時間を返す', () => {
      service.callTool('record_attendance', { userId: 'テスト太郎', type: '出勤', date: '2025-02-03' });
      const result = service.callTool('calc_overtime', { userId: 'テスト太郎', month: '2025-02' });
      expect(result).toContain('0時間0分');
    });

    it('記録なしの月は0時間を返す', () => {
      const result = service.callTool('calc_overtime', { userId: '田中', month: '2099-01' });
      expect(result).toContain('0時間0分');
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
                candidates: [{ content: { parts: [{ text: '了解です' }] } }],
                text: () => '了解です',
              },
            }),
          }),
        }),
      }));

      const svc = new AttendanceService();
      const result = await svc.runAgent('田中さんの勤怠を確認したい');
      expect(result.reply).toBe('了解です');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('ツール呼び出し後に最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          startChat: () => ({
            sendMessage: jest.fn()
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ functionCall: { name: 'get_attendance', args: { userId: '田中', date: '2025-01-06' } } }] } }],
                  text: () => '',
                },
              })
              .mockResolvedValueOnce({
                response: {
                  candidates: [{ content: { parts: [{ text: '田中さんの1月6日の勤怠です' }] } }],
                  text: () => '田中さんの1月6日の勤怠です',
                },
              }),
          }),
        }),
      }));

      const svc = new AttendanceService();
      const result = await svc.runAgent('田中さんの2025-01-06の勤怠を確認して');
      expect(result.reply).toBe('田中さんの1月6日の勤怠です');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('get_attendance');
    });
  });
});
