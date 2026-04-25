export interface DatedIngestRequest {
  text: string;
  title?: string;
  documentDate: string; // YYYY-MM-DD
}

export interface DatedIngestResponse {
  success: boolean;
  chunkCount: number;
  title?: string;
  documentDate: string;
  executionTimeMs: number;
}

export interface DatedQueryRequest {
  question: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export interface DatedQueryResponse {
  answer: string;
  dateRange: { from: string; to: string };
  sources: Array<{ content: string; title?: string; documentDate: string; similarity: number }>;
  executionTimeMs: number;
}

export interface DatedDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
