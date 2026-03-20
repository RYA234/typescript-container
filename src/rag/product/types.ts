export interface Product {
  name: string;
  description: string;
  price?: number;
  category?: string;
}

export interface ProductIngestRequest {
  products: Product[];
}

export interface ProductIngestResponse {
  success: boolean;
  registeredCount: number;
  executionTimeMs: number;
}

export interface ProductSearchResult extends Product {
  id: string;
  similarity: number;
}

export interface ProductSearchResponse {
  results: ProductSearchResult[];
  executionTimeMs: number;
}

export interface ProductDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
