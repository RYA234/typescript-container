export type SearchMode = 'vector' | 'keyword' | 'hybrid';

export interface HybridQueryRequest {
  question: string;
  searchMode?: SearchMode;
  vectorWeight?: number;
  keywordWeight?: number;
}

export interface HybridSource {
  content: string;
  vectorScore: number | null;
  keywordScore: number | null;
  hybridScore: number;
}

export interface HybridQueryResponse {
  answer: string;
  sources: HybridSource[];
  searchMode: SearchMode;
  executionTimeMs: number;
}

export interface HybridIngestRequest {
  text: string;
  source?: string;
}

export interface HybridIngestResponse {
  success: boolean;
  chunkCount: number;
  executionTimeMs: number;
}

export interface HybridDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
