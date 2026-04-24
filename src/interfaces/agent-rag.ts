export type RagAgentToolName = 'search_documents' | 'get_current_date' | 'calculate';

export interface SearchResult {
  content: string;
  score: number;
  source: string;
}

export interface RagAgentToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface RagAgentResponse {
  reply: string;
  toolCalls: RagAgentToolCall[];
}
