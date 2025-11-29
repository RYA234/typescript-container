export interface ConfiguredServices {
  gemini: boolean;
  langchain: boolean;
  supabase: boolean;
}

export interface HealthCheckResponse {
  status: string;
  configured: ConfiguredServices;
  timestamp: string;
}
