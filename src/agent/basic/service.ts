import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { AgentResponse, ToolCall, ToolName } from '../../interfaces/agent-basic';

const WEATHER_DATA: Record<string, string> = {
  東京: '晴れ, 22°C',
  大阪: '曇り, 19°C',
  名古屋: '晴れ, 21°C',
  札幌: '雪, -2°C',
  福岡: '雨, 17°C',
  京都: '晴れ, 20°C',
  横浜: '晴れ, 22°C',
  神戸: '曇り, 18°C',
  仙台: '曇り, 14°C',
  広島: '晴れ, 19°C',
};

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_weather',
        description: '指定した都市の現在の天気と気温を返す',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            city: { type: SchemaType.STRING, description: '都市名（例: 東京）' },
          },
          required: ['city'],
        },
      },
      {
        name: 'calculate',
        description: '四則演算を計算する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            expression: { type: SchemaType.STRING, description: '計算式（例: 3 + 5 * 2）' },
          },
          required: ['expression'],
        },
      },
      {
        name: 'get_current_time',
        description: '現在の日時を返す',
        parameters: { type: SchemaType.OBJECT, properties: {} },
      },
    ],
  },
];

export class BasicAgentService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<AgentResponse> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools,
    });

    const chat = model.startChat();
    const toolCalls: ToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const part = candidate.content.parts[0];
      if (!part.functionCall) break;

      const { name, args } = part.functionCall;
      const result = this.callTool(name as ToolName, args as Record<string, unknown>);

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

  callTool(name: ToolName, args: Record<string, unknown>): string {
    switch (name) {
      case 'get_weather': {
        const city = args['city'] as string;
        return WEATHER_DATA[city] ?? `${city}の天気情報は取得できませんでした`;
      }
      case 'calculate': {
        const expression = args['expression'] as string;
        try {
          const result = Function(`"use strict"; return (${expression})`)();
          return String(result);
        } catch {
          return '計算できませんでした';
        }
      }
      case 'get_current_time':
        return new Date().toISOString();
      default:
        return 'Unknown tool';
    }
  }
}
