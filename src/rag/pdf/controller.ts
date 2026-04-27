import { Request, Response } from 'express';
import { PdfService } from './service';
import { PdfQueryRequest } from '../../interfaces/rag-pdf';

const service = new PdfService();

export const upload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'MISSING_FILE', message: 'PDFファイルは必須です' });
    return;
  }
  const title = (req.body as { title?: string }).title?.trim();
  if (!title) {
    res.status(400).json({ error: 'MISSING_TITLE', message: 'titleは必須です' });
    return;
  }
  try {
    const result = await service.uploadPdf(req.file.buffer, title, req.file.originalname);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'UPLOAD_ERROR', message: 'PDFのアップロードに失敗しました' });
  }
};

export const query = async (req: Request, res: Response): Promise<void> => {
  const { question } = req.body as PdfQueryRequest;
  if (!question || question.trim() === '') {
    res.status(400).json({ error: 'MISSING_QUESTION', message: 'questionは必須です' });
    return;
  }
  try {
    const result = await service.query(question.trim());
    res.json(result);
  } catch {
    res.status(502).json({ error: 'QUERY_ERROR', message: 'PDF検索に失敗しました' });
  }
};

export const list = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.listPdfs();
    res.json(result);
  } catch {
    res.status(502).json({ error: 'LIST_ERROR', message: 'PDF一覧の取得に失敗しました' });
  }
};

export const deleteAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteAllDocuments();
    res.json(result);
  } catch {
    res.status(502).json({ error: 'DELETE_ERROR', message: 'PDFの削除に失敗しました' });
  }
};
