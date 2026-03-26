export type DocumentType = 'employment_rules' | 'manual' | 'minutes' | string;

export interface MultiDocIngestRequest {
  text: string;
  documentType: DocumentType;
  title?: string;
}

export interface MultiDocIngestResponse {
  success: boolean;
  chunkCount: number;
  executionTimeMs: number;
}

export interface MultiDocQueryRequest {
  question: string;
  documentType?: DocumentType;
}

export interface MultiDocSource {
  content: string;
  documentType: DocumentType;
  title?: string;
  similarity: number;
}

export interface MultiDocQueryResponse {
  answer: string;
  sources: MultiDocSource[];
  executionTimeMs: number;
}

export interface MultiDocDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}

export interface MultiDocListResponse {
  documents: Array<{
    id: string;
    documentType: DocumentType;
    title?: string;
    createdAt: string;
  }>;
}
