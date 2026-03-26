import { Request, Response } from 'express';
import { FaqService } from './service';
import { FaqIngestRequest, FaqAnswerRequest } from './types';

const isProduction = process.env.NODE_ENV === 'production';
const safeMessage = (err: unknown) =>
  isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');

export class FaqController {
  private faqService: FaqService;

  constructor() {
    this.faqService = new FaqService();
  }

  ingest = async (req: Request, res: Response): Promise<void> => {
    const { faqs } = req.body as FaqIngestRequest;

    if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'faqs は1件以上の配列で指定してください' });
      return;
    }

    try {
      const result = await this.faqService.ingestFaqs(faqs);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  answer = async (req: Request, res: Response): Promise<void> => {
    const { question } = req.body as FaqAnswerRequest;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'question は必須です' });
      return;
    }

    try {
      const result = await this.faqService.answerFaq(question);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  deleteAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.faqService.deleteAllFaqs();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };
}
