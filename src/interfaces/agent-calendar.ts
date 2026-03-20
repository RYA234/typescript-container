export interface CalendarRequest {
  message: string;
}

export interface CalendarToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface CalendarAgentResponse {
  reply: string;
  toolCalls: CalendarToolCall[];
}

export type CalendarToolName = 'get_day_of_week' | 'is_holiday' | 'calc_business_days';
