import { Request, Response } from 'express';
import { ProductService } from './service';
import { ProductIngestRequest } from './types';

const isProduction = process.env.NODE_ENV === 'production';
const safeMessage = (err: unknown) =>
  isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  ingest = async (req: Request, res: Response): Promise<void> => {
    const { products } = req.body as ProductIngestRequest;

    if (!products || !Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'products は1件以上の配列で指定してください' });
      return;
    }

    try {
      const result = await this.productService.ingestProducts(products);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
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
      const result = await this.productService.searchProducts(q, Math.min(limit, 10));
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  deleteAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.productService.deleteAllProducts();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };
}
