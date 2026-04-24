import { Request, Response } from 'express';
import { MultiAgentService } from './service';
import { MultiAgentRequest } from '../../interfaces/agent-multi';

const service = new MultiAgentService();

export const health = (_req: Request, res: Response): void => {
  res.json({ status: 'ok', feature: 'multi-agent' });
};

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as MultiAgentRequest;
  if (!message || message.trim() === '') {
    res.status(400).json({ error: 'MISSING_MESSAGE', message: 'messageは必須です' });
    return;
  }
  try {
    const result = await service.run(message.trim());
    res.json(result);
  } catch {
    res.status(503).json({ error: 'AGENT_ERROR', message: 'マルチエージェントの実行に失敗しました' });
  }
};
