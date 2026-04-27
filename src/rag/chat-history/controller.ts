import { Request, Response } from 'express';
import { ChatHistoryService } from './service';
import { PostMessageRequest, ChatSearchRequest } from '../../interfaces/rag-chat-history';

const service = new ChatHistoryService();

export const post = async (req: Request, res: Response): Promise<void> => {
  const { user, message, channel } = req.body as PostMessageRequest;
  if (!user || user.trim() === '') {
    res.status(400).json({ error: 'MISSING_USER', message: 'userは必須です' });
    return;
  }
  if (!message || message.trim() === '') {
    res.status(400).json({ error: 'MISSING_MESSAGE', message: 'messageは必須です' });
    return;
  }
  try {
    const result = await service.postMessage(user.trim(), message.trim(), channel?.trim());
    res.json(result);
  } catch {
    res.status(502).json({ error: 'POST_ERROR', message: 'メッセージの投稿に失敗しました' });
  }
};

export const history = async (req: Request, res: Response): Promise<void> => {
  const channel = req.query.channel as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  try {
    const result = await service.getHistory(channel, limit);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'HISTORY_ERROR', message: '履歴の取得に失敗しました' });
  }
};

export const search = async (req: Request, res: Response): Promise<void> => {
  const { query, channel, limit } = req.body as ChatSearchRequest;
  if (!query || query.trim() === '') {
    res.status(400).json({ error: 'MISSING_QUERY', message: 'queryは必須です' });
    return;
  }
  try {
    const result = await service.searchChatHistory(query.trim(), channel, limit);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'SEARCH_ERROR', message: '検索に失敗しました' });
  }
};

export const deleteAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteAll();
    res.json(result);
  } catch {
    res.status(502).json({ error: 'DELETE_ERROR', message: '削除に失敗しました' });
  }
};
