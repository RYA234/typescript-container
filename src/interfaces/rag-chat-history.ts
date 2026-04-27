export interface PostMessageRequest {
  user: string;
  message: string;
  channel?: string;
}

export interface PostMessageResponse {
  success: boolean;
  messageId: string;
  executionTimeMs: number;
}

export interface ChatHistoryMessage {
  id: string;
  user: string;
  message: string;
  channel: string;
  postedAt: string;
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[];
}

export interface ChatSearchRequest {
  query: string;
  channel?: string;
  limit?: number;
}

export interface ChatSearchResult {
  id: string;
  user: string;
  message: string;
  channel: string;
  postedAt: string;
  similarity: number;
}

export interface ChatSearchResponse {
  results: ChatSearchResult[];
  executionTimeMs: number;
}

export interface ChatDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
