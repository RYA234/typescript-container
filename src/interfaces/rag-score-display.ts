export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ScoredSource {
  content: string;
  similarity: number;
  documentTitle: string;
  chunkIndex: number;
  confidenceLevel: ConfidenceLevel;
}

export interface ScoredQueryRequest {
  question: string;
  confidenceThreshold?: number;
}

export interface ScoredQueryResponse {
  answer: string;
  confidence: ConfidenceLevel;
  sources: ScoredSource[];
  warning: string | null;
  executionTimeMs: number;
}

export interface ScoredIngestRequest {
  text: string;
  source?: string;
}

export interface ScoredIngestResponse {
  success: boolean;
  chunkCount: number;
  executionTimeMs: number;
}

export interface ScoredDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
