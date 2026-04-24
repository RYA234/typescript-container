export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
}

export interface QuoteItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface EstimateRequest {
  message: string;
}

export interface EstimateToolCall {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface EstimateAgentResponse {
  answer: string;
  toolsUsed: EstimateToolCall[];
  executionTimeMs: number;
}

export type EstimateToolName = 'search_product' | 'calc_subtotal' | 'generate_quote';
