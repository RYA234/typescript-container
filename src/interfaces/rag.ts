export interface IngestRequest {
  text: string;
  source?: string;
}

export interface IngestResponse {
  success: boolean;
  chunkCount: number;
  executionTimeMs: number;
  message: string;
}

export interface SearchRequest {
  q: string;
  limit?: number;
}

export interface SearchResult {
  content: string;
  similarity: number;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  executionTimeMs: number;
  message: string;
}

export interface RagQueryRequest {
  question: string;
}

export interface RagQueryResponse {
  answer: string;
  sources: SearchResult[];
  executionTimeMs: number;
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
