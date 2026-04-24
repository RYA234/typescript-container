import { OrchestratorAgent, ResearchAgent, SummaryAgent, MultiAgentService } from '../service';

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

const makeResponse = (text: string) => ({ response: { text: () => text } });

describe('OrchestratorAgent', () => {
  let agent: OrchestratorAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new OrchestratorAgent();
  });

  it('タスク配列を返す', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('["TypeScript 調査", "Python 調査", "比較まとめ"]'));
    const tasks = await agent.decomposeTask('TypeScript と Python の比較');
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks[0]).toBe('TypeScript 調査');
  });

  it('JSONパース失敗時はフォールバックで 2 件返す', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('申し訳ありませんが JSON ではありません'));
    const tasks = await agent.decomposeTask('Node.js まとめ');
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('コードブロック付き JSON を正しくパースする', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('```json\n["AI 調査", "ML 調査", "まとめ"]\n```'));
    const tasks = await agent.decomposeTask('AI と機械学習の違いを調べて');
    expect(tasks).toContain('AI 調査');
  });
});

describe('ResearchAgent', () => {
  let agent: ResearchAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ResearchAgent();
  });

  it('TypeScript トピックで DB ヒット後に Gemini 回答を返す', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('TypeScript は型安全な言語です。'));
    const result = await agent.research('TypeScript の特徴を調査');
    expect(result).toBe('TypeScript は型安全な言語です。');
  });

  it('Python トピックで DB ヒット後に Gemini 回答を返す', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('Python は AI/ML に広く使われます。'));
    const result = await agent.research('Python 調査');
    expect(result).toBe('Python は AI/ML に広く使われます。');
  });

  it('DB にないトピックは「情報なし」ベースで Gemini を呼ぶ', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('情報が不足しています。'));
    const result = await agent.research('全くマッチしないトピックXYZ');
    expect(result).toBe('情報が不足しています。');
    const callArg = mockGenerateContent.mock.calls[0][0] as string;
    expect(callArg).toContain('情報なし');
  });
});

describe('SummaryAgent', () => {
  let agent: SummaryAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new SummaryAgent();
  });

  it('調査結果をまとめたレポートを返す', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('TypeScript と Python の比較レポート：...'));
    const result = await agent.summarize([
      { topic: 'TypeScript', content: 'TypeScript は...' },
      { topic: 'Python', content: 'Python は...' },
    ]);
    expect(result).toBe('TypeScript と Python の比較レポート：...');
  });

  it('空配列でも呼び出しに成功する', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('情報がありません。'));
    const result = await agent.summarize([]);
    expect(result).toBe('情報がありません。');
  });
});

describe('MultiAgentService', () => {
  let service: MultiAgentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MultiAgentService();
  });

  it('全エージェントが協調して agentLog を返す', async () => {
    mockGenerateContent
      .mockResolvedValueOnce(makeResponse('["TypeScript 調査", "Python 調査", "まとめ作成"]')) // Orchestrator
      .mockResolvedValueOnce(makeResponse('TypeScriptの説明'))  // Research 1
      .mockResolvedValueOnce(makeResponse('Pythonの説明'))      // Research 2
      .mockResolvedValueOnce(makeResponse('最終レポート'));      // Summary

    const result = await service.run('TypeScript と Python の比較');
    expect(result.reply).toBe('最終レポート');
    expect(result.agentLog).toHaveLength(4);
    expect(result.agentLog[0].agent).toBe('Orchestrator');
    expect(result.agentLog[0].action).toBe('タスク分解');
    expect(result.agentLog[1].agent).toBe('ResearchAgent');
    expect(result.agentLog[2].agent).toBe('ResearchAgent');
    expect(result.agentLog[3].agent).toBe('SummaryAgent');
  });

  it('agentLog の各エントリに agent・action・result がある', async () => {
    mockGenerateContent
      .mockResolvedValueOnce(makeResponse('["Node.js 調査", "まとめ"]'))
      .mockResolvedValueOnce(makeResponse('Node.js の説明'))
      .mockResolvedValueOnce(makeResponse('Node.js レポート'));

    const result = await service.run('Node.js についてまとめて');
    result.agentLog.forEach((entry) => {
      expect(entry.agent).toBeTruthy();
      expect(entry.action).toBeTruthy();
      expect(entry.result).toBeTruthy();
    });
  });

  it('タスク分解が 1 件のみの場合も正常動作する', async () => {
    mockGenerateContent
      .mockResolvedValueOnce(makeResponse('["まとめ"]'))  // Orchestrator: 1 task
      .mockResolvedValueOnce(makeResponse('調査結果'))     // Research (task[0] used)
      .mockResolvedValueOnce(makeResponse('レポート'));    // Summary

    const result = await service.run('簡単なまとめ');
    expect(result.agentLog.some((e) => e.agent === 'ResearchAgent')).toBe(true);
    expect(result.agentLog.some((e) => e.agent === 'SummaryAgent')).toBe(true);
  });

  it('Orchestrator の result が配列になっている', async () => {
    mockGenerateContent
      .mockResolvedValueOnce(makeResponse('["AI 調査", "ML 調査", "まとめ"]'))
      .mockResolvedValueOnce(makeResponse('AI 説明'))
      .mockResolvedValueOnce(makeResponse('ML 説明'))
      .mockResolvedValueOnce(makeResponse('AI/ML レポート'));

    const result = await service.run('AI と機械学習の違いを調べて');
    const orchLog = result.agentLog.find((e) => e.agent === 'Orchestrator');
    expect(Array.isArray(orchLog?.result)).toBe(true);
  });
});
