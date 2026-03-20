import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { CalendarAgentResponse, CalendarToolCall, CalendarToolName } from '../../interfaces/agent-calendar';

// 日本の祝日（2025年）
const HOLIDAYS: Record<string, string> = {
  '2025-01-01': '元日',
  '2025-01-13': '成人の日',
  '2025-02-11': '建国記念の日',
  '2025-02-23': '天皇誕生日',
  '2025-03-20': '春分の日',
  '2025-04-29': '昭和の日',
  '2025-05-03': '憲法記念日',
  '2025-05-04': 'みどりの日',
  '2025-05-05': 'こどもの日',
  '2025-07-21': '海の日',
  '2025-08-11': '山の日',
  '2025-09-15': '敬老の日',
  '2025-09-23': '秋分の日',
  '2025-10-13': 'スポーツの日',
  '2025-11-03': '文化の日',
  '2025-11-23': '勤労感謝の日',
};

const DAYS = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_day_of_week',
        description: '指定した日付（YYYY-MM-DD）の曜日を返す',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: { type: SchemaType.STRING, description: '日付（例: 2025-01-01）' },
          },
          required: ['date'],
        },
      },
      {
        name: 'is_holiday',
        description: '指定した日付（YYYY-MM-DD）が祝日かどうかを返す',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: { type: SchemaType.STRING, description: '日付（例: 2025-01-01）' },
          },
          required: ['date'],
        },
      },
      {
        name: 'calc_business_days',
        description: '開始日から終了日までの営業日数（土日・祝日を除く）を計算する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            startDate: { type: SchemaType.STRING, description: '開始日（例: 2025-01-01）' },
            endDate: { type: SchemaType.STRING, description: '終了日（例: 2025-01-31）' },
          },
          required: ['startDate', 'endDate'],
        },
      },
    ],
  },
];

export class CalendarAgentService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<CalendarAgentResponse> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools,
    });

    const chat = model.startChat();
    const toolCalls: CalendarToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const part = candidate.content.parts[0];
      if (!part.functionCall) break;

      const { name, args } = part.functionCall;
      const result = this.callTool(name as CalendarToolName, args as Record<string, unknown>);

      toolCalls.push({ name, args: args as Record<string, unknown>, result });

      response = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: { result },
          },
        },
      ]);
    }

    const reply = response.response.text();
    return { reply, toolCalls };
  }

  callTool(name: CalendarToolName, args: Record<string, unknown>): string {
    switch (name) {
      case 'get_day_of_week':
        return this.getDayOfWeek(args['date'] as string);
      case 'is_holiday':
        return this.isHoliday(args['date'] as string);
      case 'calc_business_days':
        return this.calcBusinessDays(args['startDate'] as string, args['endDate'] as string);
      default:
        return 'Unknown tool';
    }
  }

  getDayOfWeek(date: string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '無効な日付です';
    return DAYS[d.getDay()];
  }

  isHoliday(date: string): string {
    return HOLIDAYS[date] ?? '祝日ではありません';
  }

  calcBusinessDays(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '無効な日付です';

    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const day = current.getDay();
      if (day !== 0 && day !== 6 && !HOLIDAYS[dateStr]) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return String(count);
  }
}
