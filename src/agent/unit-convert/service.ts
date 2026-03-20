import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { UnitConvertAgentResponse, UnitConvertToolCall, UnitConvertToolName } from '../../interfaces/agent-unit-convert';

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'convert_unit',
        description: '値を指定した単位から別の単位に変換する（距離・重量・温度・容量に対応）',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            value: { type: SchemaType.NUMBER, description: '変換する値' },
            fromUnit: { type: SchemaType.STRING, description: '変換元の単位（例: km, kg, celsius, liter）' },
            toUnit: { type: SchemaType.STRING, description: '変換先の単位（例: mile, lb, fahrenheit, gallon）' },
          },
          required: ['value', 'fromUnit', 'toUnit'],
        },
      },
    ],
  },
];

export class UnitConvertService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<UnitConvertAgentResponse> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools,
    });

    const chat = model.startChat();
    const toolCalls: UnitConvertToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const part = candidate.content.parts[0];
      if (!part.functionCall) break;

      const { name, args } = part.functionCall;
      const result = this.callTool(name as UnitConvertToolName, args as Record<string, unknown>);

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

  callTool(name: UnitConvertToolName, args: Record<string, unknown>): string {
    if (name === 'convert_unit') {
      return this.convertUnit(
        args['value'] as number,
        args['fromUnit'] as string,
        args['toUnit'] as string,
      );
    }
    return 'Unknown tool';
  }

  convertUnit(value: number, fromUnit: string, toUnit: string): string {
    const key = `${fromUnit.toLowerCase()}→${toUnit.toLowerCase()}`;

    const conversions: Record<string, () => number> = {
      // 距離
      'km→mile': () => value * 0.621371,
      'mile→km': () => value * 1.60934,
      'km→m': () => value * 1000,
      'm→km': () => value / 1000,
      'm→ft': () => value * 3.28084,
      'ft→m': () => value / 3.28084,
      'mile→m': () => value * 1609.34,
      'm→mile': () => value / 1609.34,
      // 重量
      'kg→lb': () => value * 2.20462,
      'lb→kg': () => value / 2.20462,
      'kg→g': () => value * 1000,
      'g→kg': () => value / 1000,
      'g→oz': () => value * 0.035274,
      'oz→g': () => value / 0.035274,
      'lb→g': () => value * 453.592,
      'g→lb': () => value / 453.592,
      // 温度
      'celsius→fahrenheit': () => value * 9 / 5 + 32,
      'fahrenheit→celsius': () => (value - 32) * 5 / 9,
      'celsius→kelvin': () => value + 273.15,
      'kelvin→celsius': () => value - 273.15,
      'fahrenheit→kelvin': () => (value - 32) * 5 / 9 + 273.15,
      'kelvin→fahrenheit': () => (value - 273.15) * 9 / 5 + 32,
      // 容量
      'liter→gallon': () => value * 0.264172,
      'gallon→liter': () => value * 3.78541,
      'liter→ml': () => value * 1000,
      'ml→liter': () => value / 1000,
      'ml→gallon': () => value * 0.000264172,
      'gallon→ml': () => value * 3785.41,
    };

    const fn = conversions[key];
    if (!fn) return `${fromUnit} から ${toUnit} への変換はサポートされていません`;

    const result = fn();
    return String(Math.round(result * 10000) / 10000);
  }
}
