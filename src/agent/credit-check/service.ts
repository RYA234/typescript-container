import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { CompanyRecord, CreditCheckAgentResponse, CreditCheckToolCall, CreditCheckToolName, CreditJudgment } from '../../interfaces/agent-credit-check';

const COMPANY_DB: Map<string, CompanyRecord> = new Map([
  ['株式会社サンプル',   { creditScore: 75, isValid: true }],
  ['テスト商事株式会社', { creditScore: 85, isValid: true }],
  ['有限会社デモ',       { creditScore: 55, isValid: true }],
  ['株式会社不審',       { creditScore: 30, isValid: true }],
  ['架空企業',           { creditScore: 0,  isValid: false }],
]);

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'validate_company',
        description: '会社名の存在・形式バリデーションを行う',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            companyName: { type: SchemaType.STRING, description: '会社名' },
          },
          required: ['companyName'],
        },
      },
      {
        name: 'score_credit',
        description: '会社名から与信スコア（0〜100）を算出する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            companyName: { type: SchemaType.STRING, description: '会社名' },
          },
          required: ['companyName'],
        },
      },
      {
        name: 'judge_credit',
        description: '与信スコアから最終判定を返す',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.NUMBER, description: '与信スコア（0〜100）' },
          },
          required: ['score'],
        },
      },
    ],
  },
];

export class CreditCheckAgentService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<CreditCheckAgentResponse> {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools,
    });

    const chat = model.startChat();
    const toolsUsed: CreditCheckToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const part = candidate.content.parts[0];
      if (!part.functionCall) break;

      const { name, args } = part.functionCall;
      const input = args as Record<string, unknown>;
      const output = this.callTool(name as CreditCheckToolName, input);

      toolsUsed.push({ name, input, output });

      response = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: output,
          },
        },
      ]);
    }

    const answer = response.response.text();
    return { answer, toolsUsed, executionTimeMs: Date.now() - startTime };
  }

  callTool(name: CreditCheckToolName, args: Record<string, unknown>): Record<string, unknown> {
    switch (name) {
      case 'validate_company': {
        const companyName = args['companyName'] as string;
        if (!companyName || companyName.length <= 1) {
          return { result: 'invalid: 会社名が短すぎます' };
        }
        const record = COMPANY_DB.get(companyName);
        if (record && !record.isValid) {
          return { result: 'invalid: 存在しない会社です' };
        }
        return { result: 'valid' };
      }
      case 'score_credit': {
        const companyName = args['companyName'] as string;
        const record = COMPANY_DB.get(companyName);
        const score = record ? record.creditScore : 50;
        return { score };
      }
      case 'judge_credit': {
        const score = args['score'] as number;
        const judgment = this.judgeByScore(score);
        return { judgment };
      }
      default:
        return { error: 'Unknown tool' };
    }
  }

  private judgeByScore(score: number): CreditJudgment {
    if (score >= 80) return '優良承認';
    if (score >= 60) return '承認';
    if (score >= 40) return '条件付き承認';
    return '否認';
  }
}
