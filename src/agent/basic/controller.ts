import { Request, Response } from 'express';
import { BasicAgentService } from './service';
import { AgentRequest } from '../../interfaces/agent-basic';

const isProduction = process.env.NODE_ENV === 'production';
const safeMessage = (err: unknown) =>
  isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');

export class BasicAgentController {
  private service: BasicAgentService;

  constructor() {
    this.service = new BasicAgentService();
  }

  chat = async (req: Request, res: Response): Promise<void> => {
    const { message } = req.body as AgentRequest;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'message は必須です' });
      return;
    }

    try {
      const result = await this.service.runAgent(message.trim());
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'AGENT_ERROR', message: safeMessage(err) });
    }
  };

  health = (_req: Request, res: Response): void => {
    res.json({ status: 'ok' });
  };
}
