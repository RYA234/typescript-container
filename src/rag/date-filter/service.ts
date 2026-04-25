import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  DatedDeleteResponse,
  DatedIngestResponse,
  DatedQueryResponse,
} from '../../interfaces/rag-date-filter';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export class DateFilterService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestDocument(
    text: string,
    documentDate: string,
    title?: string
  ): Promise<DatedIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      const { error } = await supabase.from('dated_documents').insert({
        content: chunk,
        title: title ?? null,
        document_date: documentDate,
        embedding: `[${embedding.join(',')}]`,
      });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      chunkCount: chunks.length,
      title,
      documentDate,
      executionTimeMs: Date.now() - start,
    };
  }

  async queryWithDateRange(
    question: string,
    dateFrom: string,
    dateTo: string
  ): Promise<DatedQueryResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(question);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_dated_documents', {
      query_embedding: embedding,
      date_from: dateFrom,
      date_to: dateTo,
      match_threshold: 0.5,
      match_count: 3,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    const results: Array<{ content: string; title?: string; document_date: string; similarity: number }> = data ?? [];
    const context = results
      .map((d) => `[${d.document_date}] ${d.title ?? ''}\n${d.content}`)
      .join('\n\n');

    const answer = context
      ? await this.generateAnswer(question, dateFrom, dateTo, context)
      : '指定した期間内に該当するドキュメントが見つかりませんでした。';

    return {
      answer,
      dateRange: { from: dateFrom, to: dateTo },
      sources: results.map((d) => ({
        content: d.content,
        title: d.title,
        documentDate: d.document_date,
        similarity: d.similarity,
      })),
      executionTimeMs: Date.now() - start,
    };
  }

  async deleteAllDocuments(): Promise<DatedDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('dated_documents')
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

  private async generateAnswer(
    question: string,
    dateFrom: string,
    dateTo: string,
    context: string
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `以下は ${dateFrom} 〜 ${dateTo} の期間のドキュメントです。このドキュメントのみを参考に、質問に日本語で回答してください。

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
