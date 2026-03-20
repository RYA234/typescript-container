import { Request, Response } from 'express';
import { CalendarAgentService } from './service';

const service = new CalendarAgentService();

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as { message?: string };
  if (!message || message.trim() === '') {
    res.status(400).json({ error: 'MISSING_MESSAGE', message: 'messageは必須です' });
    return;
  }

  try {
    const result = await service.runAgent(message.trim());
    res.json(result);
  } catch (err) {
    console.error('CalendarAgent error:', err);
    res.status(502).json({ error: 'GEMINI_ERROR', message: 'Gemini API呼び出しに失敗しました' });
  }
};

export const health = (_req: Request, res: Response): void => {
  res.json({ status: 'ok', feature: 'calendar-agent' });
};
