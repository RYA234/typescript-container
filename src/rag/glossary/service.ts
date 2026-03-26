import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  GlossaryTerm,
  GlossaryIngestResponse,
  GlossarySearchResponse,
  GlossaryDeleteResponse,
} from './types';

export class GlossaryService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestTerms(terms: GlossaryTerm[]): Promise<GlossaryIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();

    for (const term of terms) {
      const text = `${term.term} ${term.definition}`;
      const embedding = await this.generateEmbedding(text);
      const { error } = await supabase
        .from('glossary')
        .insert({ ...term, embedding: `[${embedding.join(',')}]` });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      registeredCount: terms.length,
      executionTimeMs: Date.now() - start,
    };
  }

  async searchGlossary(query: string, limit = 5): Promise<GlossarySearchResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(query);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_terms', {
      query_embedding: embedding,
      match_threshold: 0.6,
      match_count: limit,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    return {
      results: data ?? [],
      executionTimeMs: Date.now() - start,
    };
  }

  async deleteAllTerms(): Promise<GlossaryDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('glossary')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return {
      success: true,
      deletedCount,
      message: `${deletedCount}件の用語を削除しました`,
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
