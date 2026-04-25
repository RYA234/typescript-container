import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { RagService } from '../company-rules/service';
import { RagAgentChatResponse, RagAgentSearchResult } from '../../interfaces/rag-agent-chat';

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_documents',
        description: '社内ドキュメントをベクトル検索する。就業規則・ポリシー・マニュアルなどを検索できる',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: '検索クエリ' },
            limit: { type: SchemaType.NUMBER, description: '取得件数（デフォルト3）' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_current_date',
        description: '現在の日付と時刻を取得する',
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

export class RagAgentChatService {
  private genAI: GoogleGenerativeAI;
  private ragService: RagService;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.ragService = new RagService();
  }

  async chat(message: string): Promise<RagAgentChatResponse> {
    const start = Date.now();
    const toolsUsed: string[] = [];
    const searchResults: RagAgentSearchResult[] = [];

    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest', tools });
    const chatSession = model.startChat();

    let response = await chatSession.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const functionCallParts = candidate.content.parts.filter((p) => p.functionCall);
      if (functionCallParts.length === 0) break;

      const functionResponses = await Promise.all(
        functionCallParts.map(async (part) => {
          const { name, args } = part.functionCall!;
          const argsObj = args as Record<string, unknown>;

          if (!toolsUsed.includes(name)) toolsUsed.push(name);

          const result = await this.executeTool(name, argsObj, searchResults);
          return { functionResponse: { name, response: { result } } };
        })
      );

      response = await chatSession.sendMessage(functionResponses);
    }

    return {
      answer: response.response.text(),
      toolsUsed,
      searchResults,
      executionTimeMs: Date.now() - start,
    };
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    searchResults: RagAgentSearchResult[]
  ): Promise<unknown> {
    switch (name) {
      case 'search_documents': {
        const query = args['query'] as string;
        const limit = (args['limit'] as number) ?? 3;
        const res = await this.ragService.searchSimilar(query, limit);
        const hits = res.results.map((r) => ({
          content: r.content,
          similarity: r.similarity,
          source: r.metadata?.source ?? 'unknown',
        }));
        searchResults.push(...hits);
        return hits.length > 0
          ? hits.map((h, i) => `[${i + 1}] ${h.content} (類似度: ${(h.similarity * 100).toFixed(1)}%)`).join('\n')
          : '関連ドキュメントが見つかりませんでした';
      }
      case 'get_current_date':
        return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      case 'calculate': {
        const expr = args['expression'] as string;
        if (!/^[\d\s+\-*/().]+$/.test(expr)) return '計算できない式です（数字と四則演算のみ対応）';
        try {
          const result = Function(`"use strict"; return (${expr})`)() as number;
          if (!isFinite(result)) return 'ゼロ除算または計算不能な式です';
          return `${expr} = ${result.toLocaleString()}`;
        } catch {
          return '式の計算に失敗しました';
        }
      }
      default:
        return `不明なツール: ${name}`;
    }
  }
}
