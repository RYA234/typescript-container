export interface CompanyRecord {
  creditScore: number;
  isValid: boolean;
}

export type CreditJudgment = '優良承認' | '承認' | '条件付き承認' | '否認';

export interface CreditCheckRequest {
  message: string;
}

export interface CreditCheckToolCall {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface CreditCheckAgentResponse {
  answer: string;
  toolsUsed: CreditCheckToolCall[];
  executionTimeMs: number;
}

export type CreditCheckToolName = 'validate_company' | 'score_credit' | 'judge_credit';
