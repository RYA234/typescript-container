export interface UnitConvertRequest {
  message: string;
}

export interface UnitConvertToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface UnitConvertAgentResponse {
  reply: string;
  toolCalls: UnitConvertToolCall[];
}

export type UnitConvertToolName = 'convert_unit';
