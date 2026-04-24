import { Request, Response } from 'express';
import { ResearchService } from './service';
import { ResearchRequest } from '../../interfaces/agent-research';

const service = new ResearchService();

export const health = (_req: Request, res: Response): void => {
  res.json({ status: 'ok', feature: 'research' });
};

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message, maxIterations } = req.body as ResearchRequest;

  if (!message || message.trim() === '') {
    res.status(400).json({ error: 'MISSING_MESSAGE', message: 'messageは必須です' });
    return;
  }

  if (maxIterations !== undefined && maxIterations < 0) {
    res.status(400).json({ error: 'INVALID_MAX_ITERATIONS', message: 'maxIterationsは0以上の整数を指定してください' });
    return;
  }

  try {
    const result = await service.runResearch(message.trim(), maxIterations);
    res.json(result);
  } catch {
    res.status(503).json({ error: 'AGENT_ERROR', message: 'リサーチエージェントの実行に失敗しました' });
  }
};
