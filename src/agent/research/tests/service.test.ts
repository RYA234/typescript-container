import { ResearchService } from '../service';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

jest.mock('../../../shared/config', () => ({
  config: { gemini: { apiKey: 'test-key' } },
}));

const makeResponse = (text: string) => ({
  response: { text: () => text },
});

describe('ResearchService', () => {
  let service: ResearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResearchService();
  });

  describe('searchWeb', () => {
    it('TypeScript キーワードで関連結果を返す', () => {
      const result = service.searchWeb('TypeScript 最新バージョン');
      expect(result).toContain('TypeScript 5.3');
    });

    it('TypeScript 5.3 新機能を返す', () => {
      const result = service.searchWeb('TypeScript 5.3 新機能');
      expect(result).toContain('Import Attributes');
    });

    it('Node.js キーワードで関連結果を返す', () => {
      const result = service.searchWeb('Node.js 概要');
      expect(result).toContain('Node.js');
    });

    it('マッチしないクエリで検索結果なしを返す', () => {
      const result = service.searchWeb('全くマッチしないクエリXYZ');
      expect(result).toContain('検索結果なし');
    });

    it('複数キーワードでスコアリングして返す', () => {
      const result = service.searchWeb('TypeScript パフォーマンス');
      expect(result).toContain('TypeScript');
      expect(result).toContain('改善');
    });
  });

  describe('decideNext', () => {
    it('done を返す', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeResponse('{"action":"done","nextQuery":"","reason":"十分な情報"}'));
      const result = await service.decideNext('TypeScriptの要約', 'TypeScriptについて教えて');
      expect(result.action).toBe('done');
      expect(result.reason).toBe('十分な情報');
    });

    it('continue と nextQuery を返す', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeResponse('{"action":"continue","nextQuery":"TypeScript 5.3 新機能","reason":"詳細が必要"}'));
      const result = await service.decideNext('概要のみ', 'TypeScriptについて詳しく教えて');
      expect(result.action).toBe('continue');
      expect(result.nextQuery).toBe('TypeScript 5.3 新機能');
    });

    it('JSONパース失敗で done にフォールバック', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeResponse('invalid json response'));
      const result = await service.decideNext('何か', '質問');
      expect(result.action).toBe('done');
      expect(result.reason).toBe('JSONパース失敗');
    });

    it('コードブロック付きJSONも正しくパースする', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeResponse('```json\n{"action":"done","nextQuery":"","reason":"OK"}\n```'));
      const result = await service.decideNext('要約', '質問');
      expect(result.action).toBe('done');
    });
  });

  describe('runResearch', () => {
    it('1イテレーションで完了する（done を返す）', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeResponse('TypeScriptは型付きJS'))       // summarize
        .mockResolvedValueOnce(makeResponse('{"action":"done","nextQuery":"","reason":"十分"}'))  // decideNext
        .mockResolvedValueOnce(makeResponse('TypeScriptについての最終回答')); // generateFinalReply

      const result = await service.runResearch('TypeScriptについて教えて', 5);
      expect(result.iterations).toBe(1);
      expect(result.reply).toBe('TypeScriptについての最終回答');
      expect(result.searchHistory).toHaveLength(1);
      expect(result.searchHistory[0].query).toBe('TypeScriptについて教えて');
    });

    it('maxIterations で打ち切りになる', async () => {
      // maxIterations=2: summarize → decideNext(continue) → summarize → (break) → generateFinalReply
      mockGenerateContent
        .mockResolvedValueOnce(makeResponse('要約1'))
        .mockResolvedValueOnce(makeResponse('{"action":"continue","nextQuery":"TypeScript 5.3 新機能","reason":"まだ調査中"}'))
        .mockResolvedValueOnce(makeResponse('要約2'))
        .mockResolvedValueOnce(makeResponse('最終回答'));

      const result = await service.runResearch('TypeScriptについて教えて', 2);
      expect(result.iterations).toBe(2);
      expect(result.searchHistory).toHaveLength(2);
      expect(result.reply).toBe('最終回答');
    });

    it('maxIterations=1 で decideNext を呼ばずに終了', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeResponse('要約'))     // summarize
        .mockResolvedValueOnce(makeResponse('最終回答')); // generateFinalReply

      const result = await service.runResearch('何か調べて', 1);
      expect(result.iterations).toBe(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2); // summarize + generateFinalReply only
    });

    it('maxIterations=0 で空のレスポンスを返す', async () => {
      const result = await service.runResearch('何か調べて', 0);
      expect(result.iterations).toBe(0);
      expect(result.searchHistory).toHaveLength(0);
      expect(result.reply).toBe('調査結果が得られませんでした');
    });

    it('3回目で done になる', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeResponse('要約1'))
        .mockResolvedValueOnce(makeResponse('{"action":"continue","nextQuery":"次のクエリ1","reason":"続ける"}'))
        .mockResolvedValueOnce(makeResponse('要約2'))
        .mockResolvedValueOnce(makeResponse('{"action":"continue","nextQuery":"次のクエリ2","reason":"続ける"}'))
        .mockResolvedValueOnce(makeResponse('要約3'))
        .mockResolvedValueOnce(makeResponse('{"action":"done","nextQuery":"","reason":"十分"}'))
        .mockResolvedValueOnce(makeResponse('最終回答3'));

      const result = await service.runResearch('調査クエリ', 5);
      expect(result.iterations).toBe(3);
      expect(result.searchHistory).toHaveLength(3);
    });

    it('searchHistory の各エントリに query・rawResult・summary が存在する', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeResponse('TypeScript要約'))
        .mockResolvedValueOnce(makeResponse('{"action":"done","nextQuery":"","reason":"十分"}'))
        .mockResolvedValueOnce(makeResponse('最終回答'));

      const result = await service.runResearch('TypeScript 最新バージョン', 5);
      const entry = result.searchHistory[0];
      expect(entry.query).toBeTruthy();
      expect(entry.rawResult).toBeTruthy();
      expect(entry.summary).toBe('TypeScript要約');
    });
  });
});
