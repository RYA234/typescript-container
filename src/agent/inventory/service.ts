import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { InventoryAgentResponse, InventoryToolCall, InventoryToolName } from '../../interfaces/agent-inventory';

interface Product {
  name: string;
  stock: number;
  price: number;
}

const PRODUCTS: Product[] = [
  { name: '商品A', stock: 120, price: 1500 },
  { name: '商品B', stock: 45, price: 3200 },
  { name: '商品C', stock: 0, price: 800 },
  { name: '商品D', stock: 200, price: 5000 },
];

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_stock',
        description: '商品名から在庫数を取得する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            productName: { type: SchemaType.STRING, description: '商品名（例: 商品A）' },
          },
          required: ['productName'],
        },
      },
      {
        name: 'get_price',
        description: '商品名から単価を取得する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            productName: { type: SchemaType.STRING, description: '商品名（例: 商品A）' },
          },
          required: ['productName'],
        },
      },
      {
        name: 'calculate_total',
        description: '数量と単価から合計金額を計算する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            quantity: { type: SchemaType.NUMBER, description: '数量' },
            price: { type: SchemaType.NUMBER, description: '単価' },
          },
          required: ['quantity', 'price'],
        },
      },
    ],
  },
];

export class InventoryAgentService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<InventoryAgentResponse> {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools,
    });

    const chat = model.startChat();
    const toolsUsed: InventoryToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const part = candidate.content.parts[0];
      if (!part.functionCall) break;

      const { name, args } = part.functionCall;
      const input = args as Record<string, unknown>;
      const output = this.callTool(name as InventoryToolName, input);

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

  callTool(name: InventoryToolName, args: Record<string, unknown>): Record<string, unknown> {
    switch (name) {
      case 'get_stock': {
        const productName = args['productName'] as string;
        const product = PRODUCTS.find((p) => p.name === productName);
        if (!product) return { error: `${productName}は見つかりません` };
        return { productName, stock: product.stock, unit: '個' };
      }
      case 'get_price': {
        const productName = args['productName'] as string;
        const product = PRODUCTS.find((p) => p.name === productName);
        if (!product) return { error: `${productName}は見つかりません` };
        return { productName, price: product.price, unit: '円' };
      }
      case 'calculate_total': {
        const quantity = args['quantity'] as number;
        const price = args['price'] as number;
        return { total: quantity * price, unit: '円' };
      }
      default:
        return { error: 'Unknown tool' };
    }
  }
}
