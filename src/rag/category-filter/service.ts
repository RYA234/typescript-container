import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  Category,
  CategoryFilterDeleteResponse,
  CategoryFilterIngestResponse,
  CategoryFilterQueryResponse,
} from '../../interfaces/rag-category-filter';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export class CategoryFilterService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestDocument(
    text: string,
    category: Category,
    department?: string
  ): Promise<CategoryFilterIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      const { error } = await supabase.from('filtered_documents').insert({
        content: chunk,
        category,
        department: department ?? null,
        embedding: `[${embedding.join(',')}]`,
      });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      chunkCount: chunks.length,
      category,
      executionTimeMs: Date.now() - start,
    };
  }

  async queryWithFilter(question: string, category: Category): Promise<CategoryFilterQueryResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(question);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_filtered_documents', {
      query_embedding: embedding,
      filter_category: category,
      match_threshold: 0.5,
      match_count: 3,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    const results: Array<{ content: string; category: string; department?: string; similarity: number }> = data ?? [];
    const context = results.map((d) => d.content).join('\n\n');
    const answer = context
      ? await this.generateAnswer(question, category, context)
      : '該当するドキュメントが見つかりませんでした。';

    return {
      answer,
      filteredBy: category,
      sources: results.map((d) => ({
        content: d.content,
        similarity: d.similarity,
        department: d.department,
      })),
      executionTimeMs: Date.now() - start,
    };
  }

  async deleteAllDocuments(): Promise<CategoryFilterDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('filtered_documents')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return {
      success: true,
      deletedCount,
      message: `${deletedCount}件のドキュメントを削除しました`,
    };
  }

  private splitIntoChunks(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + size));
      i += size - overlap;
      if (i + overlap >= text.length) break;
    }
    if (chunks.length === 0 || text.slice(chunks[chunks.length - 1].length) !== '') {
      const last = text.slice(Math.max(0, text.length - size));
      if (chunks.length === 0 || chunks[chunks.length - 1] !== last) {
        chunks.push(last);
      }
    }
    return chunks.filter((c) => c.trim().length > 0);
  }

  private async generateAnswer(question: string, category: Category, context: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `以下は「${category}」カテゴリのドキュメントです。このドキュメントのみを参考に、質問に日本語で回答してください。

ドキュメント:
${context}

質問: ${question}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
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
