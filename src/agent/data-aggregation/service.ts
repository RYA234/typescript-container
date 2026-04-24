import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import {
  DataAggregationAgentResponse,
  DataAggregationToolCall,
  DataAggregationToolName,
  InventoryRecord,
  SalesRecord,
} from '../../interfaces/agent-data-aggregation';

const SALES_DATA: Map<string, SalesRecord> = new Map([
  ['2025-01', {
    period: '2025-01', totalAmount: 1250000, prevMonthRatio: 1.05,
    topProducts: [{ name: 'ノートパソコン', amount: 600000 }, { name: 'モニター', amount: 350000 }, { name: 'キーボード', amount: 180000 }],
  }],
  ['2025-02', {
    period: '2025-02', totalAmount: 980000, prevMonthRatio: 0.78,
    topProducts: [{ name: 'キーボード', amount: 250000 }, { name: 'マウス', amount: 180000 }, { name: 'プリンター', amount: 140000 }],
  }],
  ['2025-03', {
    period: '2025-03', totalAmount: 1450000, prevMonthRatio: 1.48,
    topProducts: [{ name: 'ノートパソコン', amount: 720000 }, { name: 'モニター', amount: 420000 }, { name: 'マウス', amount: 160000 }],
  }],
]);

const INVENTORY_DATA: InventoryRecord[] = [
  { productName: 'ノートパソコン', stock: 20,  unit: '台', turnoverRate: 2.3 },
  { productName: 'マウス',         stock: 150, unit: '個', turnoverRate: 5.2 },
  { productName: 'キーボード',     stock: 80,  unit: '個', turnoverRate: 3.1 },
  { productName: 'モニター',       stock: 35,  unit: '台', turnoverRate: 1.8 },
  { productName: 'プリンター',     stock: 12,  unit: '台', turnoverRate: 0.9 },
];

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_sales',
        description: '指定期間（YYYY-MM）の売上データを取得する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            period: { type: SchemaType.STRING, description: '対象月（YYYY-MM）' },
          },
          required: ['period'],
        },
      },
      {
        name: 'get_inventory',
        description: '現在の全商品在庫データを取得する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'generate_report',
        description: '売上・在庫データからテキストレポートを生成する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            salesData:     { type: SchemaType.STRING, description: '売上データ（JSON文字列）' },
            inventoryData: { type: SchemaType.STRING, description: '在庫データ（JSON文字列）' },
          },
          required: ['salesData', 'inventoryData'],
        },
      },
    ],
  },
];

export class DataAggregationService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<DataAggregationAgentResponse> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest', tools });
    const chat = model.startChat();
    const toolCalls: DataAggregationToolCall[] = [];

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
        const result = this.callTool(name as DataAggregationToolName, argsObj);
        toolCalls.push({ name, args: argsObj, result });
        return { functionResponse: { name, response: { result } } };
      });

      response = await chat.sendMessage(functionResponses);
    }

    const reply = response.response.text();
    return { reply, toolCalls };
  }

  callTool(name: DataAggregationToolName, args: Record<string, unknown>): string {
    switch (name) {
      case 'get_sales':
        return this.getSales(args['period'] as string);
      case 'get_inventory':
        return this.getInventory();
      case 'generate_report':
        return this.generateReport(args['salesData'] as string, args['inventoryData'] as string);
      default:
        return '不明なツールです';
    }
  }

  private getSales(period: string): string {
    const record = SALES_DATA.get(period);
    if (!record) return JSON.stringify({ error: `${period} の売上データはありません` });
    return JSON.stringify(record);
  }

  private getInventory(): string {
    return JSON.stringify(INVENTORY_DATA);
  }

  private generateReport(salesData: string, inventoryData: string): string {
    let sales: SalesRecord | null = null;
    let inventory: InventoryRecord[] = [];

    try { sales = JSON.parse(salesData) as SalesRecord; } catch { /* ignore */ }
    try { inventory = JSON.parse(inventoryData) as InventoryRecord[]; } catch { /* ignore */ }

    const lines: string[] = ['========================'];

    if (sales && sales.period) {
      const ratio = (sales.prevMonthRatio ?? 1) >= 1
        ? `+${Math.round(((sales.prevMonthRatio ?? 1) - 1) * 100)}%`
        : `${Math.round(((sales.prevMonthRatio ?? 1) - 1) * 100)}%`;
      const [y, m] = sales.period.split('-');
      lines.push(`月次レポート: ${y}年${m}月`);
      lines.push('========================');
      lines.push('【売上サマリー】');
      lines.push(`  合計売上: ${sales.totalAmount.toLocaleString()} 円`);
      lines.push(`  前月比: ${ratio}`);
      if (sales.topProducts.length > 0) {
        lines.push(`  売れ筋商品: ${sales.topProducts[0].name}（${sales.topProducts[0].amount.toLocaleString()}円）`);
      }
      lines.push('');
    }

    if (inventory.length > 0) {
      lines.push('【在庫状況】');
      for (const item of inventory) {
        lines.push(`  ${item.productName}: ${item.stock}${item.unit} （回転率 ${item.turnoverRate}）`);
      }
    }

    lines.push('========================');
    return lines.join('\n');
  }
}
