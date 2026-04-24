export interface SearchEntry {
  query: string;
  rawResult: string;
  summary: string;
}

export type NextAction = 'continue' | 'done';

export interface NextDecision {
  action: NextAction;
  nextQuery: string;
  reason: string;
}

export interface ResearchRequest {
  message: string;
  maxIterations?: number;
}

export interface ResearchResponse {
  reply: string;
  iterations: number;
  searchHistory: SearchEntry[];
}
