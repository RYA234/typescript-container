// Set up environment variables before importing
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.LANGCHAIN_API_KEY = 'test-langchain-api-key';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.PORT = '3000';

import { SampleService } from '../service';

describe('SampleService', () => {
  let sampleService: SampleService;

  beforeEach(() => {
    sampleService = new SampleService();
  });

  describe('getHealthStatus', () => {
    it('should return health status with all services configured', () => {
      const result = sampleService.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.configured.gemini).toBe(true);
      expect(result.configured.langchain).toBe(true);
      expect(result.configured.supabase).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getWelcomeMessage', () => {
    it('should return welcome message', () => {
      const result = sampleService.getWelcomeMessage();
      expect(result).toBe('Hello from Node.js on ECS!');
    });
  });
});
