export interface Faq {
  question: string;
  answer: string;
  category?: string;
}

export interface FaqIngestRequest {
  faqs: Faq[];
}

export interface FaqIngestResponse {
  success: boolean;
  registeredCount: number;
  executionTimeMs: number;
}

export interface FaqAnswerRequest {
  question: string;
}

export interface FaqAnswerResponse {
  answer: string;
  matchedQuestion: string;
  similarity: number;
  category?: string;
  executionTimeMs: number;
  notFound?: boolean;
}

export interface FaqDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
