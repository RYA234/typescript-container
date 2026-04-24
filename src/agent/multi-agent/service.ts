import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { AgentLogEntry, MultiAgentResponse, ResearchResult } from '../../interfaces/agent-multi';

const SEARCH_DB: Map<string, string> = new Map([
  ['TypeScript', 'TypeScript は Microsoft 製の静的型付け言語。JavaScript のスーパーセット。大規模開発で型安全性を提供。'],
  ['Python', 'Python は動的型付けのインタープリタ言語。科学計算・AI/ML 分野で広く使われる。学習コストが低い。'],
  ['比較', 'TypeScript: 型安全・大規模開発向き。Python: 手軽・AI/ML 向き。用途によって使い分けが重要。'],
  ['Node.js', 'Node.js は V8 エンジン上で動作する JS ランタイム。非同期 I/O により高スループットを実現。npm 資産が豊富。'],
  ['React', 'React は Meta 製の UI ライブラリ。コンポーネントベース・仮想 DOM・フックが特徴。SPA 開発に広く利用。'],
  ['AI', 'AI（人工知能）は機械に人間の知性を模倣させる技術領域。機械学習・深層学習・自然言語処理などを含む。'],
  ['機械学習', '機械学習は AI の一分野。データからパターンを学習しモデルを構築する。教師あり・なし・強化学習がある。'],
  ['Docker', 'Docker はコンテナ仮想化プラットフォーム。アプリと依存関係をイメージにパッケージング。環境差異を解消。'],
  ['Kubernetes', 'Kubernetes はコンテナオーケストレーション基盤。Pod・Service・Deployment でアプリを管理。自動スケーリング対応。'],
]);

export class OrchestratorAgent {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async decomposeTask(message: string): Promise<string[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `以下のタスクを 2〜4 個のサブタスクに分解してください。
タスク: "${message}"
JSON 配列（文字列のリスト）のみを返してください。例: ["サブタスク1", "サブタスク2", "まとめ作成"]`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [message, 'まとめ作成'];
      const parsed = JSON.parse(jsonMatch[0]) as string[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [message, 'まとめ作成'];
    } catch {
      return [message, 'まとめ作成'];
    }
  }
}

export class ResearchAgent {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async research(topic: string): Promise<string> {
    const localResult =
      [...SEARCH_DB.entries()].find(([key]) => topic.includes(key))?.[1] ?? '情報なし';
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `次の情報をもとに "${topic}" について 2〜3 文でまとめてください: ${localResult}`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}

export class SummaryAgent {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async summarize(results: ResearchResult[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const context = results.map((r) => `【${r.topic}】\n${r.content}`).join('\n\n');
    const prompt = `次の調査結果をもとに、わかりやすいレポートを作成してください:\n\n${context}`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}

export class MultiAgentService {
  private orchestrator: OrchestratorAgent;
  private researchAgent: ResearchAgent;
  private summaryAgent: SummaryAgent;

  constructor() {
    this.orchestrator = new OrchestratorAgent();
    this.researchAgent = new ResearchAgent();
    this.summaryAgent = new SummaryAgent();
  }

  async run(message: string): Promise<MultiAgentResponse> {
    const log: AgentLogEntry[] = [];

    const tasks = await this.orchestrator.decomposeTask(message);
    log.push({ agent: 'Orchestrator', action: 'タスク分解', result: tasks });

    const researchTasks = tasks.length > 1 ? tasks.slice(0, -1) : tasks;
    const results: ResearchResult[] = [];
    for (const task of researchTasks) {
      const content = await this.researchAgent.research(task);
      results.push({ topic: task, content });
      log.push({ agent: 'ResearchAgent', action: task, result: content });
    }

    const summary = await this.summaryAgent.summarize(results);
    log.push({ agent: 'SummaryAgent', action: 'まとめ', result: summary });

    return { reply: summary, agentLog: log };
  }
}
