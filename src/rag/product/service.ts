import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  Product,
  ProductIngestResponse,
  ProductSearchResponse,
  ProductDeleteResponse,
} from './types';

export class ProductService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestProducts(products: Product[]): Promise<ProductIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();

    for (const product of products) {
      const text = `${product.name} ${product.description}`;
      const embedding = await this.generateEmbedding(text);
      const { error } = await supabase
        .from('products')
        .insert({ ...product, embedding: `[${embedding.join(',')}]` });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      registeredCount: products.length,
      executionTimeMs: Date.now() - start,
    };
  }

  async searchProducts(query: string, limit = 3): Promise<ProductSearchResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(query);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    return {
      results: data ?? [],
      executionTimeMs: Date.now() - start,
    };
  }

  async deleteAllProducts(): Promise<ProductDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return {
      success: true,
      deletedCount,
      message: `${deletedCount}件の商品を削除しました`,
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
