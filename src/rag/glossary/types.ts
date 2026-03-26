export interface GlossaryTerm {
  term: string;
  definition: string;
  category?: string;
}

export interface GlossaryIngestRequest {
  terms: GlossaryTerm[];
}

export interface GlossaryIngestResponse {
  success: boolean;
  registeredCount: number;
  executionTimeMs: number;
}

export interface GlossarySearchResult extends GlossaryTerm {
  id: string;
  similarity: number;
}

export interface GlossarySearchResponse {
  results: GlossarySearchResult[];
  executionTimeMs: number;
}

export interface GlossaryDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
