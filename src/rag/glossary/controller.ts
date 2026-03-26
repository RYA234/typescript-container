import { Request, Response } from 'express';
import { GlossaryService } from './service';
import { GlossaryIngestRequest } from './types';

const isProduction = process.env.NODE_ENV === 'production';
const safeMessage = (err: unknown) =>
  isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');

export class GlossaryController {
  private glossaryService: GlossaryService;

  constructor() {
    this.glossaryService = new GlossaryService();
  }

  ingest = async (req: Request, res: Response): Promise<void> => {
    const { terms } = req.body as GlossaryIngestRequest;

    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'terms は1件以上の配列で指定してください' });
      return;
    }

    try {
      const result = await this.glossaryService.ingestTerms(terms);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const q = req.query['q'] as string;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 5;

    if (!q) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'q は必須です' });
      return;
    }

    try {
      const result = await this.glossaryService.searchGlossary(q, Math.min(limit, 10));
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  deleteAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.glossaryService.deleteAllTerms();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };
}
