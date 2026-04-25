import { Request, Response } from 'express';
import { RagAgentChatService } from './service';
import { RagAgentChatRequest } from '../../interfaces/rag-agent-chat';

const service = new RagAgentChatService();

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as RagAgentChatRequest;
  if (!message || message.trim() === '') {
    res.status(400).json({ error: 'MISSING_MESSAGE', message: 'messageは必須です' });
    return;
  }
  try {
    const result = await service.chat(message.trim());
    res.json(result);
  } catch {
    res.status(502).json({ error: 'AGENT_ERROR', message: 'RAGエージェントの実行に失敗しました' });
  }
};
