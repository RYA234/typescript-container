import { UnitConvertService } from '../service';

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      startChat: jest.fn(() => ({ sendMessage: jest.fn() })),
    })),
  }));
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    SchemaType: { OBJECT: 'object', STRING: 'string', NUMBER: 'number' },
  };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('UnitConvertService', () => {
  let service: UnitConvertService;

  beforeEach(() => {
    service = new UnitConvertService();
  });

  describe('convertUnit', () => {
    it('km → mile', () => {
      expect(service.convertUnit(100, 'km', 'mile')).toBe('62.1371');
    });

    it('mile → km', () => {
      expect(service.convertUnit(1, 'mile', 'km')).toBe('1.6093');
    });

    it('kg → lb', () => {
      expect(service.convertUnit(1, 'kg', 'lb')).toBe('2.2046');
    });

    it('celsius → fahrenheit', () => {
      expect(service.convertUnit(0, 'celsius', 'fahrenheit')).toBe('32');
    });

    it('celsius → kelvin', () => {
      expect(service.convertUnit(0, 'celsius', 'kelvin')).toBe('273.15');
    });

    it('liter → gallon', () => {
      expect(service.convertUnit(1, 'liter', 'gallon')).toBe('0.2642');
    });

    it('未対応の単位はエラーメッセージを返す', () => {
      const result = service.convertUnit(1, 'km', 'parsec');
      expect(result).toContain('サポートされていません');
    });
  });

  describe('runAgent', () => {
    it('ツール呼び出し後に最終回答を返す', async () => {
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const mockSendMessage = jest.fn()
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ functionCall: { name: 'convert_unit', args: { value: 100, fromUnit: 'km', toUnit: 'mile' } } }] } }],
            text: () => '',
          },
        })
        .mockResolvedValueOnce({
          response: {
            candidates: [{ content: { parts: [{ text: '100kmは62.14マイルです' }] } }],
            text: () => '100kmは62.14マイルです',
          },
        });

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({ startChat: () => ({ sendMessage: mockSendMessage }) }),
      }));

      const svc = new UnitConvertService();
      const result = await svc.runAgent('100kmは何マイル？');
      expect(result.reply).toBe('100kmは62.14マイルです');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('convert_unit');
    });
  });
});
