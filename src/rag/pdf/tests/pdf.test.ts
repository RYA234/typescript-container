import { PdfService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse: MockPDFParse } = require('pdf-parse') as { PDFParse: jest.Mock };

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(() => {
    service = new PdfService();
    jest.clearAllMocks();
  });

  describe('uploadPdf', () => {
    it('PDFバッファからテキストを抽出してSupabaseに登録できる', async () => {
      MockPDFParse.mockImplementation(() => ({
        getText: jest.fn().mockResolvedValue({ text: '就業規則の内容です。有給休暇は年10日付与されます。', total: 3 }),
      }));

      const mockEmbedding = Array(768).fill(0.1);
      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);

      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'pdf-uuid-1' }, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsertDoc = jest.fn().mockReturnValue({ select: mockSelect });
      const mockInsertChunk = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'pdf_documents') return { insert: mockInsertDoc };
        return { insert: mockInsertChunk };
      });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.uploadPdf(Buffer.from('dummy'), '就業規則2026年版', 'rules.pdf');

      expect(result.success).toBe(true);
      expect(result.title).toBe('就業規則2026年版');
      expect(result.pageCount).toBe(3);
      expect(result.chunkCount).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('Supabaseエラー時は例外をスローする', async () => {
      MockPDFParse.mockImplementation(() => ({
        getText: jest.fn().mockResolvedValue({ text: 'テキスト', total: 1 }),
      }));

      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(Array(768).fill(0.1));
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      await expect(service.uploadPdf(Buffer.from('dummy'), 'title', 'file.pdf'))
        .rejects.toThrow('Supabase insert error');
    });
  });

  describe('query', () => {
    it('PDF内容でRAG検索して回答できる', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockData = [
        { id: 'chunk-1', content: '有給休暇は年10日付与されます', page_number: 3, pdf_title: '就業規則2026年版', similarity: 0.91 },
      ];
      const mockRpc = jest.fn().mockResolvedValue({ data: mockData, error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service as unknown as { generateAnswer: () => Promise<string> }, 'generateAnswer')
        .mockResolvedValue('有給休暇は年10日付与されます。');
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.query('有給休暇は何日？');

      expect(result.answer).toContain('有給休暇');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].title).toBe('就業規則2026年版');
      expect(result.sources[0].page).toBe(3);
      expect(result.sources[0].similarity).toBe(0.91);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('ヒットなしの場合は該当なしメッセージを返す', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

      jest.spyOn(service as unknown as { generateEmbedding: () => Promise<number[]> }, 'generateEmbedding')
        .mockResolvedValue(Array(768).fill(0.1));
      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.query('存在しない情報');

      expect(result.answer).toContain('見つかりませんでした');
      expect(result.sources).toHaveLength(0);
    });
  });

  describe('listPdfs', () => {
    it('アップロード済みPDF一覧を返す', async () => {
      const mockData = [
        { id: 'uuid-1', title: '就業規則2026年版', file_name: 'rules.pdf', page_count: 12, uploaded_at: '2026-04-01T00:00:00Z' },
      ];
      const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      jest.spyOn(service['supabaseService'], 'getClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof service['supabaseService']['getClient']>);

      const result = await service.listPdfs();

      expect(result.pdfs).toHaveLength(1);
      expect(result.pdfs[0].title).toBe('就業規則2026年版');
      expect(result.pdfs[0].pageCount).toBe(12);
    });
  });
});
