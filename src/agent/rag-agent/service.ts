import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { RagAgentResponse, RagAgentToolCall, RagAgentToolName, SearchResult } from '../../interfaces/agent-rag';

const SAMPLE_DOCS: SearchResult[] = [
  { content: 'プロジェクトXの総予算は5,000,000円。2025年度計画。', score: 1.0, source: 'project-x.txt' },
  { content: 'プロジェクトX使用済み予算: 2,300,000円（2025-01時点）', score: 1.0, source: 'budget-report.txt' },
  { content: '有給休暇ポリシー: 入社後6ヶ月で10日付与。最大40日繰越可。', score: 1.0, source: 'hr-policy.txt' },
  { content: '就業時間: 9:00〜18:00（休憩1時間）。フレックス制度あり（コアタイム10:00〜15:00）。', score: 1.0, source: 'work-rules.txt' },
  { content: '残業上限: 月45時間、年360時間。36協定に準拠。', score: 1.0, source: 'work-rules.txt' },
  { content: '交通費支給: 上限月50,000円。定期代実費支給。', score: 1.0, source: 'expense-policy.txt' },
  { content: '育児休業: 子が2歳になるまで取得可。男女問わず取得推奨。', score: 1.0, source: 'hr-policy.txt' },
];

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_documents',
        description: '社内ドキュメントをRAG検索する。就業規則・予算・ポリシーなどを検索できる',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: '検索クエリ' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_current_date',
        description: '現在の日付と時刻を返す',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'calculate',
        description: '算術式を計算する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            expression: { type: SchemaType.STRING, description: '算術式（例: 5000000 - 2300000）' },
          },
          required: ['expression'],
        },
      },
    ],
  },
];

export class RagAgentService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<RagAgentResponse> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest', tools });
    const chat = model.startChat();
    const toolCalls: RagAgentToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const functionCallParts = candidate.content.parts.filter((p) => p.functionCall);
      if (functionCallParts.length === 0) break;

      const functionResponses = functionCallParts.map((part) => {
        const { name, args } = part.functionCall!;
        const argsObj = args as Record<string, unknown>;
        const result = this.callTool(name as RagAgentToolName, argsObj);
        toolCalls.push({ name, args: argsObj, result });
        return { functionResponse: { name, response: { result } } };
      });

      response = await chat.sendMessage(functionResponses);
    }

    const reply = response.response.text();
    return { reply, toolCalls };
  }

  callTool(name: RagAgentToolName, args: Record<string, unknown>): string {
    switch (name) {
      case 'search_documents':
        return this.searchDocuments(args['query'] as string);
      case 'get_current_date':
        return this.getCurrentDate();
      case 'calculate':
        return this.calculate(args['expression'] as string);
      default:
        return '不明なツールです';
    }
  }

  private searchDocuments(query: string): string {
    const keywords = query.replace(/[　\s]+/g, ' ').split(' ').filter(Boolean);
    const scored = SAMPLE_DOCS.map((doc) => {
      const hits = keywords.filter((kw) => doc.content.includes(kw) || doc.source.includes(kw)).length;
      return { ...doc, score: hits };
    }).filter((d) => d.score > 0);

    if (scored.length === 0) return '関連ドキュメントが見つかりませんでした';

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] ${r.content} (出典: ${r.source})`)
      .join('\n');
  }

  private getCurrentDate(): string {
    return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  }

  private calculate(expression: string): string {
    // 安全な算術のみ許可（数字・演算子・スペース・小数点のみ）
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return '計算できない式です（数字と四則演算のみ対応）';
    }
    try {
      const result = Function(`"use strict"; return (${expression})`)() as number;
      if (!isFinite(result)) return 'ゼロ除算または計算不能な式です';
      return `${expression} = ${result.toLocaleString()}`;
    } catch {
      return '式の計算に失敗しました';
    }
  }
}
