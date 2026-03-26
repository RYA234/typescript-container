import { Request, Response } from 'express';
import { RecipeService } from './service';
import { RecipeIngestRequest, RecipeSuggestRequest } from './types';

const isProduction = process.env.NODE_ENV === 'production';
const safeMessage = (err: unknown) =>
  isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');

export class RecipeController {
  private recipeService: RecipeService;

  constructor() {
    this.recipeService = new RecipeService();
  }

  ingest = async (req: Request, res: Response): Promise<void> => {
    const { recipes } = req.body as RecipeIngestRequest;

    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'recipes は1件以上の配列で指定してください' });
      return;
    }

    try {
      const result = await this.recipeService.ingestRecipes(recipes);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  suggest = async (req: Request, res: Response): Promise<void> => {
    const { query } = req.body as RecipeSuggestRequest;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.status(400).json({ error: 'MISSING_PARAM', message: 'query は必須です' });
      return;
    }

    try {
      const result = await this.recipeService.suggestRecipes(query.trim());
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };

  deleteAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.recipeService.deleteAllRecipes();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'SUPABASE_ERROR', message: safeMessage(err) });
    }
  };
}
