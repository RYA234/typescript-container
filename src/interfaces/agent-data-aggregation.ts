export type DataAggregationToolName = 'get_sales' | 'get_inventory' | 'generate_report';

export interface SalesRecord {
  period: string;
  totalAmount: number;
  prevMonthRatio: number;
  topProducts: { name: string; amount: number }[];
}

export interface InventoryRecord {
  productName: string;
  stock: number;
  unit: string;
  turnoverRate: number;
}

export interface DataAggregationToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface DataAggregationAgentResponse {
  reply: string;
  toolCalls: DataAggregationToolCall[];
}
