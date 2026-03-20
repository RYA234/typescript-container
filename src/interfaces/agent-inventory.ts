export interface InventoryRequest {
  message: string;
}

export interface InventoryToolCall {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface InventoryAgentResponse {
  answer: string;
  toolsUsed: InventoryToolCall[];
  executionTimeMs: number;
}

export type InventoryToolName = 'get_stock' | 'get_price' | 'calculate_total';
