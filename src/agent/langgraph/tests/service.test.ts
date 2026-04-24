import { LangGraphService } from '../service';

const mockInvoke = jest.fn().mockResolvedValue({
  messages: ['test'],
  messageType: 'answer',
  finalAnswer: 'テスト回答',
  searchResult: undefined,
  calcResult: undefined,
});

jest.mock('@langchain/langgraph', () => {
  const END = '__end__';
  const START = '__start__';
  const mockAnnotationFn = (opts: unknown) => opts;
  const Annotation = Object.assign(mockAnnotationFn, {
    Root: (channels: unknown) => ({ channels, State: {} }),
  });
  const StateGraph = jest.fn().mockImplementation(() => ({
    addNode: jest.fn().mockReturnThis(),
    addEdge: jest.fn().mockReturnThis(),
    addConditionalEdges: jest.fn().mockReturnThis(),
    compile: jest.fn().mockReturnValue({ invoke: mockInvoke }),
  }));
  return { StateGraph, END, START, Annotation };
});

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => 'answer' },
      }),
    })),
  }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

describe('LangGraphService', () => {
  let service: LangGraphService;

  beforeEach(() => {
    service = new LangGraphService();
  });

  describe('searchNode', () => {
    it('東京キーワードで人口データを返す', () => {
      const result = service.searchNode({ messages: ['東京の人口は？'], messageType: undefined, searchResult: undefined, calcResult: undefined, finalAnswer: undefined });
      expect(result.searchResult).toContain('東京');
    });

    it('大阪キーワードで人口データを返す', () => {
      const result = service.searchNode({ messages: ['大阪の人口は？'], messageType: undefined, searchResult: undefined, calcResult: undefined, finalAnswer: undefined });
      expect(result.searchResult).toContain('大阪');
    });

    it('マッチしないキーワードはメッセージを返す', () => {
      const result = service.searchNode({ messages: ['存在しない場所xyz'], messageType: undefined, searchResult: undefined, calcResult: undefined, finalAnswer: undefined });
      expect(result.searchResult).toContain('見つかりませんでした');
    });
  });

  describe('calcNode', () => {
    it('掛け算を計算する', () => {
      const result = service.calcNode({ messages: ['100 * 200 を計算して'], messageType: undefined, searchResult: undefined, calcResult: undefined, finalAnswer: undefined });
      expect(result.calcResult).toContain('20,000');
    });

    it('足し算を計算する', () => {
      const result = service.calcNode({ messages: ['100 + 200 + 300'], messageType: undefined, searchResult: undefined, calcResult: undefined, finalAnswer: undefined });
      expect(result.calcResult).toContain('600');
    });

    it('算術式がなければメッセージを返す', () => {
      const result = service.calcNode({ messages: ['おはようございます'], messageType: undefined, searchResult: undefined, calcResult: undefined, finalAnswer: undefined });
      expect(result.calcResult).toContain('見つかりませんでした');
    });
  });

  describe('routeByType', () => {
    it('search を返す', () => {
      expect(service.routeByType({ messages: [], messageType: 'search', searchResult: undefined, calcResult: undefined, finalAnswer: undefined })).toBe('search');
    });
    it('calculate を返す', () => {
      expect(service.routeByType({ messages: [], messageType: 'calculate', searchResult: undefined, calcResult: undefined, finalAnswer: undefined })).toBe('calculate');
    });
    it('answer を返す', () => {
      expect(service.routeByType({ messages: [], messageType: 'answer', searchResult: undefined, calcResult: undefined, finalAnswer: undefined })).toBe('answer');
    });
    it('undefined の場合は answer にフォールバック', () => {
      expect(service.routeByType({ messages: [], messageType: undefined, searchResult: undefined, calcResult: undefined, finalAnswer: undefined })).toBe('answer');
    });
  });

  describe('runGraph', () => {
    it('answer タイプでグラフパスを返す', async () => {
      mockInvoke.mockResolvedValueOnce({ messages: ['test'], messageType: 'answer', finalAnswer: 'テスト回答', searchResult: undefined, calcResult: undefined });
      const result = await service.runGraph('テストメッセージ');
      expect(result.reply).toBe('テスト回答');
      expect(result.graphPath).toContain('classify');
      expect(result.graphPath).toContain('answer');
    });

    it('search タイプで search ノードがパスに含まれる', async () => {
      mockInvoke.mockResolvedValueOnce({ messages: ['test'], messageType: 'search', finalAnswer: '東京の人口は1400万人', searchResult: '東京都人口: 約1,400万人', calcResult: undefined });
      const result = await service.runGraph('東京の人口は？');
      expect(result.graphPath).toContain('search');
      expect(result.state.messageType).toBe('search');
    });

    it('calculate タイプで calculate ノードがパスに含まれる', async () => {
      mockInvoke.mockResolvedValueOnce({ messages: ['test'], messageType: 'calculate', finalAnswer: '結果は300', searchResult: undefined, calcResult: '100 + 200 = 300' });
      const result = await service.runGraph('100 + 200');
      expect(result.graphPath).toContain('calculate');
      expect(result.state.calcResult).toContain('300');
    });
  });
});
