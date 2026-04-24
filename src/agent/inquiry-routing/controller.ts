import { Request, Response } from 'express';
import { InquiryRoutingService } from './service';

const service = new InquiryRoutingService();

export const health = (_req: Request, res: Response): void => {
  res.json({ status: 'ok', feature: 'inquiry-routing-agent' });
};

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as { message?: string };
  if (!message || message.trim() === '') {
    res.status(400).json({ error: 'MISSING_MESSAGE', message: 'messageは必須です' });
    return;
  }
  try {
    const result = await service.runAgent(message.trim());
    res.json(result);
  } catch {
    res.status(500).json({ error: 'AGENT_ERROR', message: 'エージェントの実行に失敗しました' });
  }
};
