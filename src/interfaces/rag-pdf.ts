export interface PdfUploadResponse {
  success: boolean;
  title: string;
  fileName: string;
  pageCount: number;
  chunkCount: number;
  executionTimeMs: number;
}

export interface PdfListItem {
  id: string;
  title: string;
  fileName: string;
  pageCount: number | null;
  uploadedAt: string;
}

export interface PdfListResponse {
  pdfs: PdfListItem[];
}

export interface PdfQueryRequest {
  question: string;
}

export interface PdfQuerySource {
  title: string;
  page: number;
  content: string;
  similarity: number;
}

export interface PdfQueryResponse {
  answer: string;
  sources: PdfQuerySource[];
  executionTimeMs: number;
}

export interface PdfDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
