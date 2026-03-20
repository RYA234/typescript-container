import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { OrderStatusAgentResponse, OrderStatusToolCall, OrderStatusToolName } from '../../interfaces/agent-order-status';

interface OrderRecord {
  status: string;
  estimatedDelivery: string | null;
}

const ORDER_DATA: Record<string, OrderRecord> = {
  'ORD-001': { status: '配送中', estimatedDelivery: '2025-12-25' },
  'ORD-002': { status: '処理中', estimatedDelivery: '2025-12-28' },
  'ORD-003': { status: '配送完了', estimatedDelivery: '2025-12-20' },
  'ORD-004': { status: 'キャンセル', estimatedDelivery: null },
  'ORD-005': { status: '注文受付', estimatedDelivery: '2025-12-30' },
};

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_order_status',
        description: '注文IDから現在のステータスを取得する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            orderId: { type: SchemaType.STRING, description: '注文ID（例: ORD-001）' },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'get_estimated_delivery',
        description: '注文IDから配送予定日を取得する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            orderId: { type: SchemaType.STRING, description: '注文ID（例: ORD-001）' },
          },
          required: ['orderId'],
        },
      },
    ],
  },
];

export class OrderStatusService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async runAgent(message: string): Promise<OrderStatusAgentResponse> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools,
    });

    const chat = model.startChat();
    const toolCalls: OrderStatusToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const part = candidate.content.parts[0];
      if (!part.functionCall) break;

      const { name, args } = part.functionCall;
      const result = this.callTool(name as OrderStatusToolName, args as Record<string, unknown>);

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

  callTool(name: OrderStatusToolName, args: Record<string, unknown>): string {
    const orderId = args['orderId'] as string;
    const order = ORDER_DATA[orderId];

    switch (name) {
      case 'get_order_status':
        if (!order) return `注文ID ${orderId} は見つかりません`;
        return order.status;
      case 'get_estimated_delivery':
        if (!order) return `注文ID ${orderId} は見つかりません`;
        return order.estimatedDelivery ?? '配送予定日なし（キャンセル済み）';
      default:
        return 'Unknown tool';
    }
  }
}
