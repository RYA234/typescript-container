import { config } from '../shared';
import { HealthCheckResponse, ConfiguredServices } from '../interfaces';

export class SampleService {
  getHealthStatus(): HealthCheckResponse {
    const isDummyGemini = config.gemini.apiKey.toLowerCase().includes('dummy') ||
                          config.gemini.apiKey.includes('DEMO') ||
                          config.gemini.apiKey.includes('EXAMPLE');
    const isDummyLangchain = config.langchain.apiKey.toLowerCase().includes('dummy') ||
                             config.langchain.apiKey.includes('DEMO') ||
                             config.langchain.apiKey.includes('EXAMPLE');
    const isDummySupabase = config.supabase.url.toLowerCase().includes('dummy') ||
                            config.supabase.url.includes('demo-') ||
                            config.supabase.anonKey.toLowerCase().includes('dummy') ||
                            config.supabase.anonKey.includes('DEMO');

    const configured: ConfiguredServices = {
      gemini: !!config.gemini.apiKey && !isDummyGemini,
      langchain: !!config.langchain.apiKey && !isDummyLangchain,
      supabase: !!config.supabase.url && !!config.supabase.anonKey && !isDummySupabase,
    };

    return {
      status: 'healthy',
      configured,
      timestamp: new Date().toISOString(),
    };
  }

  getWelcomeMessage(): string {
    return 'Hello from Node.js on ECS!';
  }
}
