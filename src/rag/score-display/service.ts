import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  ConfidenceLevel,
  ScoredDeleteResponse,
  ScoredIngestResponse,
  ScoredQueryResponse,
  ScoredSource,
} from '../../interfaces/rag-score-display';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export class ScoredService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingest(text: string, source = 'scored-demo'): Promise<ScoredIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      const { error } = await supabase
        .from('documents')
        .insert({ content: chunk, embedding: `[${embedding.join(',')}]`, metadata: { source } });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return { success: true, chunkCount: chunks.length, executionTimeMs: Date.now() - start };
  }

  async queryWithScore(question: string, threshold = 0.3): Promise<ScoredQueryResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const embedding = await this.generateEmbedding(question);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    const rows: Array<{ content: string; similarity: number; metadata?: { source?: string } }> = data ?? [];

    const sources: ScoredSource[] = rows.map((d, i) => ({
      content: d.content,
      similarity: d.similarity,
      documentTitle: d.metadata?.source ?? 'ドキュメント',
      chunkIndex: i + 1,
      confidenceLevel: this.calcConfidenceLevel(d.similarity),
    }));

    const maxSimilarity = sources.length > 0 ? Math.max(...sources.map((s) => s.similarity)) : 0;
    const confidence = sources.length > 0 ? this.calcConfidenceLevel(maxSimilarity) : 'LOW';

    const context = rows.map((d, i) => `[チャンク${i + 1}]\n${d.content}`).join('\n\n');
    const answer = context
      ? await this.generateAnswer(question, context)
      : '関連するドキュメントが見つかりませんでした。';

    const warning =
      confidence === 'LOW' || sources.length === 0
        ? '関連情報が不足している可能性があります。回答の精度が低い場合があります。'
        : null;

    return { answer, confidence, sources, warning, executionTimeMs: Date.now() - start };
  }

  async deleteAll(): Promise<ScoredDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('documents')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return { success: true, deletedCount, message: `${deletedCount}件のドキュメントを削除しました` };
  }

  private calcConfidenceLevel(similarity: number): ConfidenceLevel {
    if (similarity >= 0.85) return 'HIGH';
    if (similarity >= 0.7) return 'MEDIUM';
    return 'LOW';
  }

  private splitIntoChunks(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + size));
      i += size - overlap;
      if (i + overlap >= text.length) break;
    }
    const last = text.slice(Math.max(0, text.length - size));
    if (chunks.length === 0 || chunks[chunks.length - 1] !== last) chunks.push(last);
    return chunks.filter((c) => c.trim().length > 0);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      outputDimensionality: 768,
    } as Parameters<typeof model.embedContent>[0]);
    return result.embedding.values;
  }

  private async generateAnswer(question: string, context: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `以下のドキュメントを参考に、質問に日本語で回答してください。

ドキュメント:
${context}

質問: ${question}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error('generateAnswer failed');
  }
}
