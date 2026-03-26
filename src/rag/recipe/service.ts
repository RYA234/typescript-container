import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  Recipe,
  RecipeIngestResponse,
  RecipeSuggestResponse,
  RecipeDeleteResponse,
} from './types';

export class RecipeService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestRecipes(recipes: Recipe[]): Promise<RecipeIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();

    for (const recipe of recipes) {
      const text = `${recipe.name} 食材:${recipe.ingredients.join(',')} ${recipe.description}`;
      const embedding = await this.generateEmbedding(text);
      const { error } = await supabase.from('recipes').insert({
        name: recipe.name,
        ingredients: recipe.ingredients,
        time_minutes: recipe.timeMinutes ?? null,
        description: recipe.description,
        embedding: `[${embedding.join(',')}]`,
      });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      registeredCount: recipes.length,
      executionTimeMs: Date.now() - start,
    };
  }

  async suggestRecipes(query: string, limit = 3): Promise<RecipeSuggestResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(query);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_recipes', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    return {
      suggestions: data ?? [],
      executionTimeMs: Date.now() - start,
    };
  }

  async deleteAllRecipes(): Promise<RecipeDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('recipes')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return {
      success: true,
      deletedCount,
      message: `${deletedCount}件のレシピを削除しました`,
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      outputDimensionality: 768,
    } as Parameters<typeof model.embedContent>[0]);
    return result.embedding.values;
  }
}
