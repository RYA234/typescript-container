export type AttendanceType = '出勤' | '退勤' | '有給' | '欠勤';
export type AttendanceToolName = 'record_attendance' | 'get_attendance' | 'calc_overtime';

export interface AttendanceRecord {
  userId: string;
  type: AttendanceType;
  date: string;
  time: string;
}

export interface AttendanceToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface AttendanceAgentResponse {
  reply: string;
  toolCalls: AttendanceToolCall[];
}
