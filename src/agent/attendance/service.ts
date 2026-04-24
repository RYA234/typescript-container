import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { config } from '../../shared/config';
import { AttendanceAgentResponse, AttendanceRecord, AttendanceToolCall, AttendanceToolName, AttendanceType } from '../../interfaces/agent-attendance';

const INITIAL_RECORDS: AttendanceRecord[] = [
  { userId: '田中', type: '出勤', date: '2025-01-06', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-06', time: '22:30' },
  { userId: '田中', type: '出勤', date: '2025-01-07', time: '09:15' },
  { userId: '田中', type: '退勤', date: '2025-01-07', time: '21:00' },
  { userId: '田中', type: '出勤', date: '2025-01-08', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-08', time: '18:30' },
  { userId: '田中', type: '出勤', date: '2025-01-09', time: '08:45' },
  { userId: '田中', type: '退勤', date: '2025-01-09', time: '17:45' },
  { userId: '田中', type: '出勤', date: '2025-01-10', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-10', time: '20:00' },
  { userId: '田中', type: '出勤', date: '2025-01-13', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-13', time: '19:30' },
  { userId: '田中', type: '有給',  date: '2025-01-14', time: '00:00' },
  { userId: '田中', type: '出勤', date: '2025-01-15', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-15', time: '18:00' },
  { userId: '田中', type: '出勤', date: '2025-01-16', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-16', time: '17:30' },
  { userId: '田中', type: '出勤', date: '2025-01-17', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-17', time: '21:30' },
  { userId: '田中', type: '出勤', date: '2025-01-20', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-20', time: '20:00' },
  { userId: '田中', type: '出勤', date: '2025-01-21', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-21', time: '19:00' },
  { userId: '田中', type: '欠勤',  date: '2025-01-22', time: '00:00' },
  { userId: '田中', type: '出勤', date: '2025-01-23', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-23', time: '22:00' },
  { userId: '田中', type: '出勤', date: '2025-01-24', time: '09:00' },
  { userId: '田中', type: '退勤', date: '2025-01-24', time: '18:00' },
  { userId: '鈴木', type: '出勤', date: '2025-01-06', time: '08:30' },
  { userId: '鈴木', type: '退勤', date: '2025-01-06', time: '17:30' },
  { userId: '鈴木', type: '出勤', date: '2025-01-07', time: '09:00' },
  { userId: '鈴木', type: '退勤', date: '2025-01-07', time: '17:45' },
  { userId: '鈴木', type: '出勤', date: '2025-01-08', time: '09:00' },
  { userId: '鈴木', type: '退勤', date: '2025-01-08', time: '18:00' },
];

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'record_attendance',
        description: 'ユーザーの勤怠（出勤・退勤・有給・欠勤）を記録する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            userId: { type: SchemaType.STRING, description: 'ユーザー名またはID' },
            type:   { type: SchemaType.STRING, description: '勤怠種別（出勤/退勤/有給/欠勤）' },
            date:   { type: SchemaType.STRING, description: '日付（YYYY-MM-DD）' },
          },
          required: ['userId', 'type', 'date'],
        },
      },
      {
        name: 'get_attendance',
        description: 'ユーザーの特定日または月の勤怠情報を取得する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            userId: { type: SchemaType.STRING, description: 'ユーザー名またはID' },
            date:   { type: SchemaType.STRING, description: '日付（YYYY-MM-DD または YYYY-MM）' },
          },
          required: ['userId', 'date'],
        },
      },
      {
        name: 'calc_overtime',
        description: '指定ユーザーの指定月の残業時間を計算する',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            userId: { type: SchemaType.STRING, description: 'ユーザー名またはID' },
            month:  { type: SchemaType.STRING, description: '対象月（YYYY-MM）' },
          },
          required: ['userId', 'month'],
        },
      },
    ],
  },
];

export class AttendanceService {
  private genAI: GoogleGenerativeAI;
  private records: AttendanceRecord[];

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.records = [...INITIAL_RECORDS];
  }

  async runAgent(message: string): Promise<AttendanceAgentResponse> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest', tools });
    const chat = model.startChat();
    const toolCalls: AttendanceToolCall[] = [];

    let response = await chat.sendMessage(message);
    let maxLoop = 10;

    while (maxLoop-- > 0) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const functionCallParts = candidate.content.parts.filter((p) => p.functionCall);
      if (functionCallParts.length === 0) break;

      const functionResponses = functionCallParts.map((part) => {
        const { name, args } = part.functionCall!;
        const argsObj = args as Record<string, unknown>;
        const result = this.callTool(name as AttendanceToolName, argsObj);
        toolCalls.push({ name, args: argsObj, result });
        return { functionResponse: { name, response: { result } } };
      });

      response = await chat.sendMessage(functionResponses);
    }

    const reply = response.response.text();
    return { reply, toolCalls };
  }

  callTool(name: AttendanceToolName, args: Record<string, unknown>): string {
    switch (name) {
      case 'record_attendance':
        return this.recordAttendance(
          args['userId'] as string,
          args['type'] as AttendanceType,
          args['date'] as string,
        );
      case 'get_attendance':
        return this.getAttendance(args['userId'] as string, args['date'] as string);
      case 'calc_overtime':
        return this.calcOvertime(args['userId'] as string, args['month'] as string);
      default:
        return '不明なツールです';
    }
  }

  private recordAttendance(userId: string, type: AttendanceType, date: string): string {
    const time = new Date().toTimeString().slice(0, 5);
    const existing = this.records.findIndex((r) => r.userId === userId && r.type === type && r.date === date);
    if (existing >= 0) {
      this.records[existing] = { userId, type, date, time };
    } else {
      this.records.push({ userId, type, date, time });
    }
    return `${userId}さんの${date}の${type}を記録しました（${time}）`;
  }

  private getAttendance(userId: string, date: string): string {
    const isMonth = /^\d{4}-\d{2}$/.test(date);
    const matched = this.records.filter((r) =>
      r.userId === userId && (isMonth ? r.date.startsWith(date) : r.date === date),
    );
    if (matched.length === 0) return `${userId}さんの${date}の勤怠記録はありません`;
    return matched.map((r) => `${r.date} ${r.type} ${r.time}`).join('\n');
  }

  private calcOvertime(userId: string, month: string): string {
    const monthRecords = this.records.filter((r) => r.userId === userId && r.date.startsWith(month));
    const byDate = new Map<string, AttendanceRecord[]>();
    for (const r of monthRecords) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date)!.push(r);
    }

    let totalMinutes = 0;
    for (const dayRecords of byDate.values()) {
      const clockIn  = dayRecords.find((r) => r.type === '出勤');
      const clockOut = dayRecords.find((r) => r.type === '退勤');
      if (!clockIn || !clockOut) continue;
      const [inH, inM]   = clockIn.time.split(':').map(Number);
      const [outH, outM] = clockOut.time.split(':').map(Number);
      const workedMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      totalMinutes += Math.max(0, workedMinutes - 8 * 60);
    }

    const hours   = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${userId}さんの${month}の残業時間は${hours}時間${minutes}分です`;
  }
}
