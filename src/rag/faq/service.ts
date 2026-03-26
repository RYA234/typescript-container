import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import { Faq, FaqIngestResponse, FaqAnswerResponse, FaqDeleteResponse } from './types';

export class FaqService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestFaqs(faqs: Faq[]): Promise<FaqIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();

    for (const faq of faqs) {
      const embedding = await this.generateEmbedding(faq.question);
      const { error } = await supabase
        .from('faqs')
        .insert({ ...faq, embedding: `[${embedding.join(',')}]` });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      registeredCount: faqs.length,
      executionTimeMs: Date.now() - start,
    };
  }

  async answerFaq(question: string): Promise<FaqAnswerResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(question);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_faqs', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 1,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    if (!data || data.length === 0) {
      return {
        answer: '該当するFAQが見つかりませんでした。',
        matchedQuestion: '',
        similarity: 0,
        notFound: true,
        executionTimeMs: Date.now() - start,
      };
    }

    const matched = data[0];
    return {
      answer: matched.answer,
      matchedQuestion: matched.question,
      similarity: matched.similarity,
      category: matched.category,
      executionTimeMs: Date.now() - start,
    };
  }

  async deleteAllFaqs(): Promise<FaqDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('faqs')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return {
      success: true,
      deletedCount,
      message: `${deletedCount}件のFAQを削除しました`,
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
