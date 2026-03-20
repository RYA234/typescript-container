export interface OrderStatusRequest {
  message: string;
}

export interface OrderStatusToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface OrderStatusAgentResponse {
  reply: string;
  toolCalls: OrderStatusToolCall[];
}

export type OrderStatusToolName = 'get_order_status' | 'get_estimated_delivery';
