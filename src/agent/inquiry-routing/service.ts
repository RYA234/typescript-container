import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import {
  InquiryAgentResponse,
  InquiryCategory,
  InquiryToolCall,
  InquiryToolName,
  Ticket,
} from '../../interfaces/agent-inquiry-routing';

const KEYWORD_MAP: Array<[RegExp, InquiryCategory]> = [
  [/届かない|配送|発送|遅延/, '配送問題'],
  [/壊れ|不良|欠陥|破損/, '商品不良'],
  [/請求|支払|返金|領収/, '請求・支払い'],
  [/エラー|動かない|バグ|不具合/, '技術サポート'],
];

const DEPT_MAP: Record<InquiryCategory, string> = {
  '配送問題': '物流部門',
  '商品不良': '品質管理部門',
  '請求・支払い': '経理部門',
  '技術サポート': 'ITサポート部門',
  '一般問い合わせ': 'カスタマーサポート部門',
};

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'analyze_inquiry',
        description: '問い合わせテキストからカテゴリを判定する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING, description: '問い合わせテキスト' },
          },
          required: ['text'],
        },
      },
      {
        name: 'get_department',
        description: '問い合わせカテゴリから担当部門を返す',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            category: { type: SchemaType.STRING, description: '問い合わせカテゴリ' },
          },
          required: ['category'],
        },
      },
      {
        name: 'create_ticket',
        description: '問い合わせ内容と担当部門でサポートチケットを作成する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            content:    { type: SchemaType.STRING, description: '問い合わせ内容' },
            department: { type: SchemaType.STRING, description: '担当部門' },
          },
          required: ['content', 'department'],
        },
      },
    ],
  },
];

export class InquiryRoutingService {
  private genAI: GoogleGenerativeAI;
  private tickets: Ticket[] = [];
  private ticketCounter = 0;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<InquiryAgentResponse> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest', tools });
    const chat = model.startChat();
    const toolCalls: InquiryToolCall[] = [];

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
        const result = this.callTool(name as InquiryToolName, argsObj);
        toolCalls.push({ name, args: argsObj, result });
        return { functionResponse: { name, response: { result } } };
      });

      response = await chat.sendMessage(functionResponses);
    }

    const reply = response.response.text();
    return { reply, toolCalls };
  }

  callTool(name: InquiryToolName, args: Record<string, unknown>): string {
    switch (name) {
      case 'analyze_inquiry':
        return this.analyzeInquiry(args['text'] as string);
      case 'get_department':
        return this.getDepartment(args['category'] as string);
      case 'create_ticket':
        return this.createTicket(args['content'] as string, args['department'] as string);
      default:
        return '不明なツールです';
    }
  }

  private analyzeInquiry(text: string): string {
    for (const [pattern, category] of KEYWORD_MAP) {
      if (pattern.test(text)) return category;
    }
    return '一般問い合わせ';
  }

  private getDepartment(category: string): string {
    return DEPT_MAP[category as InquiryCategory] ?? 'カスタマーサポート部門';
  }

  private createTicket(content: string, department: string): string {
    const id = `TKT-${String(++this.ticketCounter).padStart(3, '0')}`;
    const category = this.analyzeInquiry(content) as InquiryCategory;
    const ticket: Ticket = {
      id,
      content,
      department,
      category,
      createdAt: new Date().toISOString(),
    };
    this.tickets.push(ticket);
    return id;
  }

  getTickets(): Ticket[] {
    return this.tickets;
  }
}
