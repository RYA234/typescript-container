import { Request, Response } from 'express';
import { ScoredService } from './service';
import { ScoredIngestRequest, ScoredQueryRequest } from '../../interfaces/rag-score-display';

const service = new ScoredService();

export const ingest = async (req: Request, res: Response): Promise<void> => {
  const { text, source } = req.body as ScoredIngestRequest;
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'MISSING_TEXT', message: 'textは必須です' });
    return;
  }
  try {
    const result = await service.ingest(text.trim(), source);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'INGEST_ERROR', message: 'データの登録に失敗しました' });
  }
};

export const query = async (req: Request, res: Response): Promise<void> => {
  const { question, confidenceThreshold } = req.body as ScoredQueryRequest;
  if (!question || question.trim() === '') {
    res.status(400).json({ error: 'MISSING_QUESTION', message: 'questionは必須です' });
    return;
  }
  const threshold = typeof confidenceThreshold === 'number' ? confidenceThreshold : 0.3;
  try {
    const result = await service.queryWithScore(question.trim(), threshold);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'QUERY_ERROR', message: 'クエリに失敗しました' });
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
