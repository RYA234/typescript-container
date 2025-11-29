export interface GeminiConfig {
  apiKey: string;
}

export interface LangChainConfig {
  apiKey: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface Config {
  gemini: GeminiConfig;
  langchain: LangChainConfig;
  supabase: SupabaseConfig;
  port: number;
}
