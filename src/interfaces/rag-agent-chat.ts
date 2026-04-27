export interface RagAgentChatRequest {
  message: string;
}

export interface RagAgentSearchResult {
  content: string;
  similarity: number;
  source: string;
}

export interface RagAgentChatResponse {
  answer: string;
  toolsUsed: string[];
  searchResults: RagAgentSearchResult[];
  executionTimeMs: number;
}
