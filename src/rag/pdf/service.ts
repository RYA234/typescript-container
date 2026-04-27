import { PDFParse } from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  PdfDeleteResponse,
  PdfListResponse,
  PdfQueryResponse,
  PdfQuerySource,
  PdfUploadResponse,
} from '../../interfaces/rag-pdf';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export class PdfService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async uploadPdf(buffer: Buffer, title: string, fileName: string): Promise<PdfUploadResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();

    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    const text = pdfData.text;
    const pageCount = pdfData.total;

    const { data: doc, error: docError } = await supabase
      .from('pdf_documents')
      .insert({ title, file_name: fileName, page_count: pageCount })
      .select()
      .single();

    if (docError) throw new Error(`Supabase insert error: ${docError.message}`);

    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      const { error } = await supabase.from('pdf_chunks').insert({
        pdf_id: doc.id,
        content: chunk,
        embedding: `[${embedding.join(',')}]`,
      });
      if (error) throw new Error(`Supabase chunk insert error: ${error.message}`);
    }

    return {
      success: true,
      title,
      fileName,
      pageCount,
      chunkCount: chunks.length,
      executionTimeMs: Date.now() - start,
    };
  }

  async query(question: string): Promise<PdfQueryResponse> {
    const start = Date.now();
    const embedding = await this.generateEmbedding(question);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('match_pdf_chunks', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 3,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    const results: Array<{ content: string; page_number: number; pdf_title: string; similarity: number }> = data ?? [];
    const context = results
      .map((r) => `[${r.pdf_title} p.${r.page_number}]\n${r.content}`)
      .join('\n\n');

    const answer = context
      ? await this.generateAnswer(question, context)
      : '登録されたPDFに該当する情報が見つかりませんでした。';

    const sources: PdfQuerySource[] = results.map((r) => ({
      title: r.pdf_title,
      page: r.page_number,
      content: r.content,
      similarity: r.similarity,
    }));

    return { answer, sources, executionTimeMs: Date.now() - start };
  }

  async listPdfs(): Promise<PdfListResponse> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('pdf_documents')
      .select('id, title, file_name, page_count, uploaded_at')
      .order('uploaded_at', { ascending: false });

    if (error) throw new Error(`Supabase error: ${error.message}`);

    return {
      pdfs: (data ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        fileName: d.file_name,
        pageCount: d.page_count,
        uploadedAt: d.uploaded_at,
      })),
    };
  }

  async deleteAllDocuments(): Promise<PdfDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('pdf_documents')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return {
      success: true,
      deletedCount,
      message: `${deletedCount}件のPDFを削除しました`,
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

  private async generateAnswer(question: string, context: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `以下のPDFドキュメントの内容を参考に、質問に日本語で回答してください。

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
    throw new Error('generateAnswer failed after retries');
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
