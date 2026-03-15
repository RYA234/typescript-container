import { Request, Response } from 'express';
import { RagService } from './service';

const isProduction = process.env.NODE_ENV === 'production';
const safeMessage = (err: unknown) =>
  isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');

export class RagController {
  private ragService: RagService;

  constructor() {
    this.ragService = new RagService();
  }

  ingest = async (req: Request, res: Response): Promise<void> => {
    const { text, source } = req.body;
    if (!text) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'text は必須です' });
      return;
    }
    if (text.trim() === '') {
      res.status(400).json({ error: 'EMPTY_TEXT', message: 'テキストが空です' });
      return;
    }
    try {
      const result = await this.ragService.ingestText(text, source);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'GEMINI_ERROR', message: safeMessage(err) });
    }
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const q = req.query['q'] as string;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 3;
    if (!q) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'q は必須です' });
      return;
    }
    try {
      const result = await this.ragService.searchSimilar(q, Math.min(limit, 10));
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  query = async (req: Request, res: Response): Promise<void> => {
    const { question } = req.body;
    if (!question) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'question は必須です' });
      return;
    }
    try {
      const result = await this.ragService.queryRag(question);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === 'NO_DOCUMENTS') {
        res.status(400).json({ error: 'NO_DOCUMENTS', message: '先に /ingest でドキュメントを登録してください' });
        return;
      }
      res.status(500).json({ error: 'INTERNAL_ERROR', message: safeMessage(err) });
    }
  };

  deleteDocuments = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.ragService.deleteAllDocuments();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };
}
