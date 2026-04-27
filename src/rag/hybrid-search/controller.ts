import { Request, Response } from 'express';
import { HybridSearchService } from './service';
import { HybridIngestRequest, HybridQueryRequest, SearchMode } from '../../interfaces/rag-hybrid-search';

const service = new HybridSearchService();

const VALID_MODES: SearchMode[] = ['vector', 'keyword', 'hybrid'];

export const ingest = async (req: Request, res: Response): Promise<void> => {
  const { text, source } = req.body as HybridIngestRequest;
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
  const { question, searchMode = 'hybrid', vectorWeight = 0.5, keywordWeight = 0.5 } = req.body as HybridQueryRequest;
  if (!question || question.trim() === '') {
    res.status(400).json({ error: 'MISSING_QUESTION', message: 'questionは必須です' });
    return;
  }
  if (!VALID_MODES.includes(searchMode)) {
    res.status(400).json({ error: 'INVALID_MODE', message: 'searchModeはvector/keyword/hybridのいずれかです' });
    return;
  }
  try {
    const result = await service.query(
      question.trim(),
      searchMode,
      Number(vectorWeight),
      Number(keywordWeight),
    );
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
