export interface AgentRequest {
  message: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface AgentResponse {
  reply: string;
  toolCalls: ToolCall[];
}

export type ToolName = 'get_weather' | 'calculate' | 'get_current_time';
