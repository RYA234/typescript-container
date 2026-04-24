import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { NextDecision, ResearchResponse, SearchEntry } from '../../interfaces/agent-research';

const SEARCH_DB: Record<string, string> = {
  'TypeScript 最新バージョン': 'TypeScript 5.3 が 2024 年にリリース。Import Attributes サポート、stricterオプション追加。',
  'TypeScript 5.3 新機能': 'Import Attributes、switch(true) パターン対応、速度改善。型チェック精度向上。',
  'TypeScript パフォーマンス': 'TypeScript 5.x 系ではビルド速度が従来比 10〜15% 改善。incrementalビルドが強化。',
  'Node.js 概要': 'Node.js は V8 エンジン上で動作するサーバーサイド JavaScript ランタイム。非同期 I/O とイベントループが特徴。',
  'Node.js パフォーマンス': 'Node.js v20 ではパーミッションモデル導入。ネイティブモジュール対応強化。HTTP/2 サポート改善。',
  'Express.js ルーティング': 'Express.js は Router クラスでルーティングを管理。ミドルウェアチェーンと組み合わせて使う。',
  'Docker コンテナ': 'Docker はアプリとその依存関係をコンテナイメージに封じ込める。Dockerfile でビルド手順を定義。',
  'Docker Kubernetes': 'Docker はコンテナ実行環境、Kubernetes はオーケストレーション基盤。本番では k8s 上で Docker コンテナを動かす。',
  'React フック': 'React の useState・useEffect などのフックで関数コンポーネントに状態と副作用を追加できる。',
  'LangChain エージェント': 'LangChain のエージェントは LLM がツールを選択・実行して目標を達成する仕組み。ReAct パターンを使うことが多い。',
  'Gemini API': 'Google の Gemini API は Function Calling をサポート。テキスト生成、マルチモーダル対応。gemini-flash-latest が高速で低コスト。',
};

export class ResearchService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runResearch(message: string, maxIterations = 5): Promise<ResearchResponse> {
    const searchHistory: SearchEntry[] = [];
    let currentQuery = message;
    let iterations = 0;
    const allSummaries: string[] = [];

    while (iterations < maxIterations) {
      const rawResult = this.searchWeb(currentQuery);
      const summary = await this.summarize(rawResult);
      allSummaries.push(summary);
      searchHistory.push({ query: currentQuery, rawResult, summary });
      iterations++;

      if (iterations >= maxIterations) break;

      const decision = await this.decideNext(summary, message);
      if (decision.action === 'done') break;
      currentQuery = decision.nextQuery || message;
    }

    const reply =
      allSummaries.length > 0
        ? await this.generateFinalReply(message, allSummaries)
        : '調査結果が得られませんでした';

    return { reply, iterations, searchHistory };
  }

  searchWeb(query: string): string {
    const keywords = query.trim().split(/[\s　]+/).filter(Boolean);
    const entries = Object.entries(SEARCH_DB);

    const scored = entries
      .map(([key, value]) => {
        const target = `${key} ${value}`;
        const hits = keywords.filter((kw) => target.includes(kw)).length;
        return { key, value, hits };
      })
      .filter((e) => e.hits > 0);

    if (scored.length === 0) {
      return `検索結果なし: 「${query}」に関する情報は見つかりませんでした`;
    }

    return scored
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3)
      .map((e) => `【${e.key}】${e.value}`)
      .join('\n');
  }

  async summarize(text: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `以下の情報を100字以内で簡潔にまとめてください：\n\n${text}`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  async decideNext(summary: string, originalQuestion: string): Promise<NextDecision> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `元の質問: "${originalQuestion}"
現在の調査要約: ${summary}

この情報で質問に十分回答できますか？JSONのみで答えてください：
- 十分な場合: {"action":"done","nextQuery":"","reason":"理由"}
- 追加調査が必要: {"action":"continue","nextQuery":"次の検索クエリ","reason":"理由"}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'done', nextQuery: '', reason: 'JSONパース失敗' };
      const json = JSON.parse(jsonMatch[0]) as { action?: string; nextQuery?: string; reason?: string };
      return {
        action: json.action === 'continue' ? 'continue' : 'done',
        nextQuery: json.nextQuery ?? '',
        reason: json.reason ?? '',
      };
    } catch {
      return { action: 'done', nextQuery: '', reason: 'JSONパース失敗' };
    }
  }

  private async generateFinalReply(originalQuestion: string, summaries: string[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const summaryText = summaries.map((s, i) => `[${i + 1}] ${s}`).join('\n');
    const prompt = `以下の調査結果をもとに、「${originalQuestion}」について包括的に回答してください：\n\n${summaryText}`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}
