import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  HybridDeleteResponse,
  HybridIngestResponse,
  HybridQueryResponse,
  HybridSource,
  SearchMode,
} from '../../interfaces/rag-hybrid-search';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const RRF_K = 60;

type VectorRow = { id: string; content: string; rank: number; similarity: number };
type KeywordRow = { id: string; content: string; rank: number };

export class HybridSearchService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingest(text: string, source = 'hybrid-demo'): Promise<HybridIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      const { error } = await supabase
        .from('hybrid_documents')
        .insert({ content: chunk, embedding: `[${embedding.join(',')}]`, metadata: { source } });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return { success: true, chunkCount: chunks.length, executionTimeMs: Date.now() - start };
  }

  async query(
    question: string,
    searchMode: SearchMode = 'hybrid',
    vectorWeight = 0.5,
    keywordWeight = 0.5,
  ): Promise<HybridQueryResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();

    let sources: HybridSource[] = [];

    if (searchMode === 'vector') {
      const embedding = await this.generateEmbedding(question);
      const { data, error } = await supabase.rpc('vector_search', {
        query_embedding: embedding,
        match_count: 10,
      });
      if (error) throw new Error(`vector_search error: ${error.message}`);
      const rows: VectorRow[] = data ?? [];
      sources = rows.slice(0, 5).map((r) => ({
        content: r.content,
        vectorScore: Math.round(r.similarity * 1000) / 1000,
        keywordScore: null,
        hybridScore: Math.round(r.similarity * 1000) / 1000,
      }));
    } else if (searchMode === 'keyword') {
      const { data, error } = await supabase.rpc('keyword_search', {
        query_text: question,
        match_count: 10,
      });
      if (error) throw new Error(`keyword_search error: ${error.message}`);
      const rows: KeywordRow[] = data ?? [];
      sources = rows.slice(0, 5).map((r, i) => ({
        content: r.content,
        vectorScore: null,
        keywordScore: Math.round(this.rrfScore(i + 1) * 1000) / 1000,
        hybridScore: Math.round(this.rrfScore(i + 1) * 1000) / 1000,
      }));
    } else {
      const embedding = await this.generateEmbedding(question);
      const [vectorResult, keywordResult] = await Promise.all([
        supabase.rpc('vector_search', { query_embedding: embedding, match_count: 10 }),
        supabase.rpc('keyword_search', { query_text: question, match_count: 10 }),
      ]);
      if (vectorResult.error) throw new Error(`vector_search error: ${vectorResult.error.message}`);
      if (keywordResult.error) throw new Error(`keyword_search error: ${keywordResult.error.message}`);
      sources = this.mergeResults(
        vectorResult.data ?? [],
        keywordResult.data ?? [],
        vectorWeight,
        keywordWeight,
      );
    }

    const context = sources.map((s, i) => `[${i + 1}] ${s.content}`).join('\n\n');
    const answer = context
      ? await this.generateAnswer(question, context)
      : '関連するドキュメントが見つかりませんでした。';

    return { answer, sources, searchMode, executionTimeMs: Date.now() - start };
  }

  async deleteAll(): Promise<HybridDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('hybrid_documents')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`Supabase delete error: ${error.message}`);
    const deletedCount = count ?? 0;
    return { success: true, deletedCount, message: `${deletedCount}件のドキュメントを削除しました` };
  }

  private rrfScore(rank: number): number {
    return 1 / (RRF_K + rank);
  }

  private mergeResults(
    vectorResults: VectorRow[],
    keywordResults: KeywordRow[],
    vectorWeight: number,
    keywordWeight: number,
  ): HybridSource[] {
    const scoreMap = new Map<string, { content: string; vectorScore: number | null; keywordScore: number | null; hybridScore: number }>();

    for (const r of vectorResults) {
      const vs = this.rrfScore(r.rank) * vectorWeight;
      scoreMap.set(r.id, {
        content: r.content,
        vectorScore: Math.round(this.rrfScore(r.rank) * 1000) / 1000,
        keywordScore: null,
        hybridScore: vs,
      });
    }

    for (const r of keywordResults) {
      const ks = this.rrfScore(r.rank) * keywordWeight;
      const existing = scoreMap.get(r.id);
      if (existing) {
        existing.keywordScore = Math.round(this.rrfScore(r.rank) * 1000) / 1000;
        existing.hybridScore += ks;
      } else {
        scoreMap.set(r.id, {
          content: r.content,
          vectorScore: null,
          keywordScore: Math.round(this.rrfScore(r.rank) * 1000) / 1000,
          hybridScore: ks,
        });
      }
    }

    return [...scoreMap.values()]
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, 5)
      .map((s) => ({ ...s, hybridScore: Math.round(s.hybridScore * 10000) / 10000 }));
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
