import { Request, Response } from 'express';
import { MultiDocService } from './service';
import { MultiDocIngestRequest, MultiDocQueryRequest } from './types';

const isProduction = process.env.NODE_ENV === 'production';
const safeMessage = (err: unknown) =>
  isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');

export class MultiDocController {
  private multiDocService: MultiDocService;

  constructor() {
    this.multiDocService = new MultiDocService();
  }

  ingest = async (req: Request, res: Response): Promise<void> => {
    const { text, documentType, title } = req.body as MultiDocIngestRequest;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'text は必須です' });
      return;
    }
    if (!documentType || typeof documentType !== 'string') {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'documentType は必須です' });
      return;
    }

    try {
      const result = await this.multiDocService.ingestDocument(text.trim(), documentType, title);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  query = async (req: Request, res: Response): Promise<void> => {
    const { question, documentType } = req.body as MultiDocQueryRequest;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'question は必須です' });
      return;
    }

    try {
      const result = await this.multiDocService.queryMultiDoc(question.trim(), documentType);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.multiDocService.listDocuments();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  deleteAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.multiDocService.deleteAllDocuments();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };
}
