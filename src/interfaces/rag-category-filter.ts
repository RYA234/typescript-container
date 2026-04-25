export type Category = 'sales' | 'hr' | 'accounting' | 'it' | 'general';

export interface CategoryFilterIngestRequest {
  text: string;
  category: Category;
  department?: string;
}

export interface CategoryFilterIngestResponse {
  success: boolean;
  chunkCount: number;
  category: Category;
  executionTimeMs: number;
}

export interface CategoryFilterQueryRequest {
  question: string;
  category: Category;
}

export interface CategoryFilterQueryResponse {
  answer: string;
  filteredBy: Category;
  sources: Array<{ content: string; similarity: number; department?: string }>;
  executionTimeMs: number;
}

export interface CategoryFilterDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
