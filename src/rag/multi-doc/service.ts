import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  DocumentType,
  MultiDocIngestResponse,
  MultiDocQueryResponse,
  MultiDocDeleteResponse,
  MultiDocListResponse,
} from './types';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export class MultiDocService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async ingestDocument(
    text: string,
    documentType: DocumentType,
    title?: string
  ): Promise<MultiDocIngestResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      const { error } = await supabase.from('multi_documents').insert({
        content: chunk,
        document_type: documentType,
        title: title ?? null,
        embedding: `[${embedding.join(',')}]`,
        metadata: { chunkCount: chunks.length },
      });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      success: true,
      chunkCount: chunks.length,
      executionTimeMs: Date.now() - start,
    };
  }

  async queryMultiDoc(question: string, documentType?: DocumentType): Promise<MultiDocQueryResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(question);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_all_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    const results = documentType
      ? (data ?? []).filter((d: { document_type: string }) => d.document_type === documentType)
      : (data ?? []);

    const context = results
      .map((d: { document_type: string; title?: string; content: string }) =>
        `[${d.document_type}] ${d.title ?? ''}\n${d.content}`
      )
      .join('\n\n');

    const answer = context
      ? await this.generateAnswer(question, context)
      : '該当するドキュメントが見つかりませんでした。';

    return {
      answer,
      sources: results.map((d: { content: string; document_type: string; title?: string; similarity: number }) => ({
        content: d.content,
        documentType: d.document_type,
        title: d.title,
        similarity: d.similarity,
      })),
      executionTimeMs: Date.now() - start,
    };
  }

  async listDocuments(): Promise<MultiDocListResponse> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('multi_documents')
      .select('id, document_type, title, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Supabase error: ${error.message}`);

    return {
      documents: (data ?? []).map((d) => ({
        id: d.id,
        documentType: d.document_type,
        title: d.title ?? undefined,
        createdAt: d.created_at,
      })),
    };
  }

  async deleteAllDocuments(): Promise<MultiDocDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('multi_documents')
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
    return chunks.filter(c => c.trim().length > 0);
  }

  private async generateAnswer(question: string, context: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `以下のドキュメントを参考に、質問に日本語で回答してください。回答には出典のドキュメント種類を示してください。

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
