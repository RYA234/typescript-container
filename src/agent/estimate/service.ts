import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { EstimateAgentResponse, EstimateToolCall, EstimateToolName, Product, QuoteItem } from '../../interfaces/agent-estimate';

const PRODUCTS: Map<string, Product> = new Map([
  ['ノートパソコン', { id: 'PC-001',  name: 'ノートパソコン', price: 120000, unit: '台' }],
  ['マウス',         { id: 'ACC-001', name: 'マウス',         price: 2500,   unit: '個' }],
  ['キーボード',     { id: 'ACC-002', name: 'キーボード',     price: 5000,   unit: '個' }],
  ['モニター',       { id: 'MON-001', name: 'モニター',       price: 35000,  unit: '台' }],
  ['プリンター',     { id: 'PRN-001', name: 'プリンター',     price: 28000,  unit: '台' }],
]);

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_product',
        description: '商品名で商品情報を検索する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            productName: { type: SchemaType.STRING, description: '商品名' },
          },
          required: ['productName'],
        },
      },
      {
        name: 'calc_subtotal',
        description: '商品IDと数量から小計を計算する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            productId: { type: SchemaType.STRING, description: '商品ID' },
            quantity:  { type: SchemaType.NUMBER, description: '数量' },
          },
          required: ['productId', 'quantity'],
        },
      },
      {
        name: 'generate_quote',
        description: '明細リストから見積書テキストを生成する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            items: {
              type: SchemaType.ARRAY,
              description: '見積明細（JSON文字列配列）',
              items: { type: SchemaType.STRING },
            },
          },
          required: ['items'],
        },
      },
    ],
  },
];

export class EstimateAgentService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<EstimateAgentResponse> {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest', tools });
    const chat = model.startChat();
    const toolsUsed: EstimateToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const functionCallParts = candidate.content.parts.filter((p) => p.functionCall);
      if (functionCallParts.length === 0) break;

      const functionResponses = functionCallParts.map((part) => {
        const { name, args } = part.functionCall!;
        const input = args as Record<string, unknown>;
        const output = this.callTool(name as EstimateToolName, input);
        toolsUsed.push({ name, input, output });
        return { functionResponse: { name, response: output } };
      });

      response = await chat.sendMessage(functionResponses);
    }

    const answer = response.response.text();
    return { answer, toolsUsed, executionTimeMs: Date.now() - startTime };
  }

  callTool(name: EstimateToolName, args: Record<string, unknown>): Record<string, unknown> {
    switch (name) {
      case 'search_product': {
        const productName = args['productName'] as string;
        const product = PRODUCTS.get(productName);
        if (!product) return { error: `${productName}は取り扱いがありません` };
        return { id: product.id, name: product.name, price: product.price, unit: product.unit };
      }
      case 'calc_subtotal': {
        const productId = args['productId'] as string;
        const quantity = args['quantity'] as number;
        const product = [...PRODUCTS.values()].find((p) => p.id === productId);
        if (!product) return { error: `商品ID ${productId} は見つかりません` };
        const subtotal = product.price * quantity;
        return { productName: product.name, quantity, unitPrice: product.price, unit: product.unit, subtotal };
      }
      case 'generate_quote': {
        const items = args['items'] as string[];
        const quoteItems: QuoteItem[] = items.map((item) => JSON.parse(item) as QuoteItem);
        const total = quoteItems.reduce((sum, item) => sum + item.subtotal, 0);
        const today = new Date().toISOString().split('T')[0];

        const lines = [
          '見積書',
          '================',
          '品目                数量    単価（円）    小計（円）',
          '----------------+-------+-------------+----------',
          ...quoteItems.map(
            (item) =>
              `${item.productName.padEnd(12)}  ${String(item.quantity).padStart(4)}${item.unitPrice.toLocaleString().padStart(14)}  ${item.subtotal.toLocaleString().padStart(10)}`
          ),
          '================',
          `合計: ${total.toLocaleString()}円`,
          '================',
          `発行日: ${today}`,
        ];

        return { quote: lines.join('\n'), total };
      }
      default:
        return { error: 'Unknown tool' };
    }
  }
}
