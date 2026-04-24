export type InquiryCategory =
  | '配送問題'
  | '商品不良'
  | '請求・支払い'
  | '技術サポート'
  | '一般問い合わせ';

export type InquiryToolName = 'analyze_inquiry' | 'get_department' | 'create_ticket';

export interface Ticket {
  id: string;
  content: string;
  department: string;
  category: InquiryCategory;
  createdAt: string;
}

export interface InquiryToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface InquiryAgentResponse {
  reply: string;
  toolCalls: InquiryToolCall[];
}
