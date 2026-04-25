import { Request, Response } from 'express';
import { CategoryFilterService } from './service';
import {
  Category,
  CategoryFilterIngestRequest,
  CategoryFilterQueryRequest,
} from '../../interfaces/rag-category-filter';

const VALID_CATEGORIES: Category[] = ['sales', 'hr', 'accounting', 'it', 'general'];

const service = new CategoryFilterService();

export const ingest = async (req: Request, res: Response): Promise<void> => {
  const { text, category, department } = req.body as CategoryFilterIngestRequest;
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'MISSING_TEXT', message: 'textは必須です' });
    return;
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: 'INVALID_CATEGORY', message: `categoryは ${VALID_CATEGORIES.join(' / ')} のいずれかです` });
    return;
  }
  try {
    const result = await service.ingestDocument(text.trim(), category, department?.trim());
    res.json(result);
  } catch {
    res.status(502).json({ error: 'INGEST_ERROR', message: 'ドキュメントの登録に失敗しました' });
  }
};

export const query = async (req: Request, res: Response): Promise<void> => {
  const { question, category } = req.body as CategoryFilterQueryRequest;
  if (!question || question.trim() === '') {
    res.status(400).json({ error: 'MISSING_QUESTION', message: 'questionは必須です' });
    return;
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: 'INVALID_CATEGORY', message: `categoryは ${VALID_CATEGORIES.join(' / ')} のいずれかです` });
    return;
  }
  try {
    const result = await service.queryWithFilter(question.trim(), category);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'QUERY_ERROR', message: 'カテゴリ検索に失敗しました' });
  }
};

export const deleteDocuments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteAllDocuments();
    res.json(result);
  } catch {
    res.status(502).json({ error: 'DELETE_ERROR', message: 'ドキュメントの削除に失敗しました' });
  }
};
