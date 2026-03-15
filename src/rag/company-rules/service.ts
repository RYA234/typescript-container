import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  IngestResponse,
  SearchResult,
  SearchResponse,
  RagQueryResponse,
  DeleteResponse,
} from '../../interfaces/rag';

export class RagService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestText(text: string, source = 'unknown'): Promise<IngestResponse> {
    const startTime = Date.now();
    const chunks = this.chunkText(text);
    const supabase = this.supabaseService.getClient();
    const totalChunks = chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.generateEmbedding(chunks[i]);
      const metadata = { source, chunkIndex: i, totalChunks };
      const { error } = await supabase
        .from('documents')
        .insert({ content: chunks[i], embedding: `[${embedding.join(',')}]`, metadata });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      chunkCount: totalChunks,
      executionTimeMs: Date.now() - startTime,
      message: `${totalChunks}チャンクを登録しました`,
    };
  }

  async searchSimilar(query: string, limit = 3): Promise<SearchResponse> {
    const startTime = Date.now();
    const embedding = await this.generateEmbedding(query);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    const results: SearchResult[] = (data ?? []).map((row: { content: string; similarity: number; metadata: { source: string; chunkIndex: number; totalChunks: number } }) => ({
      content: row.content,
      similarity: row.similarity,
      metadata: row.metadata,
    }));

    return {
      results,
      executionTimeMs: Date.now() - startTime,
      message: `${results.length}件の類似チャンクが見つかりました`,
    };
  }

  async queryRag(question: string): Promise<RagQueryResponse> {
    const startTime = Date.now();
    const searchResponse = await this.searchSimilar(question);

    if (searchResponse.results.length === 0) {
      throw Object.assign(new Error('NO_DOCUMENTS'), { code: 'NO_DOCUMENTS' });
    }

    const context = searchResponse.results.map(r => r.content).join('\n\n');
    const answer = await this.generateAnswer(question, context);

    return {
      answer,
      sources: searchResponse.results,
      executionTimeMs: Date.now() - startTime,
      message: `${searchResponse.results.length}件のソースを参照して回答しました`,
    };
  }

  async deleteAllDocuments(): Promise<DeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('documents')
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

  private chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - overlap;
    }
    return chunks;
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
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `以下のコンテキストのみを使って質問に答えてください。
コンテキストに答えがない場合は「情報が見つかりませんでした」と答えてください。

コンテキスト:
${context}

質問: ${question}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
