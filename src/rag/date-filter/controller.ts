import { Request, Response } from 'express';
import { DateFilterService } from './service';
import { DatedIngestRequest, DatedQueryRequest } from '../../interfaces/rag-date-filter';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const service = new DateFilterService();

export const ingest = async (req: Request, res: Response): Promise<void> => {
  const { text, title, documentDate } = req.body as DatedIngestRequest;
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'MISSING_TEXT', message: 'textは必須です' });
    return;
  }
  if (!documentDate || !DATE_PATTERN.test(documentDate)) {
    res.status(400).json({ error: 'INVALID_DATE', message: 'documentDateはYYYY-MM-DD形式で指定してください' });
    return;
  }
  try {
    const result = await service.ingestDocument(text.trim(), documentDate, title?.trim());
    res.json(result);
  } catch {
    res.status(502).json({ error: 'INGEST_ERROR', message: 'ドキュメントの登録に失敗しました' });
  }
};

export const query = async (req: Request, res: Response): Promise<void> => {
  const { question, dateFrom, dateTo } = req.body as DatedQueryRequest;
  if (!question || question.trim() === '') {
    res.status(400).json({ error: 'MISSING_QUESTION', message: 'questionは必須です' });
    return;
  }
  if (!dateFrom || !DATE_PATTERN.test(dateFrom)) {
    res.status(400).json({ error: 'INVALID_DATE_FROM', message: 'dateFromはYYYY-MM-DD形式で指定してください' });
    return;
  }
  if (!dateTo || !DATE_PATTERN.test(dateTo)) {
    res.status(400).json({ error: 'INVALID_DATE_TO', message: 'dateToはYYYY-MM-DD形式で指定してください' });
    return;
  }
  if (dateFrom > dateTo) {
    res.status(400).json({ error: 'INVALID_DATE_RANGE', message: 'dateFromはdateTo以前の日付を指定してください' });
    return;
  }
  try {
    const result = await service.queryWithDateRange(question.trim(), dateFrom, dateTo);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'QUERY_ERROR', message: '日付範囲検索に失敗しました' });
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
