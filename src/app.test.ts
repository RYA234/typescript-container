// Set up environment variables before importing app
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.LANGCHAIN_API_KEY = 'test-langchain-api-key';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.PORT = '3000';

import request from 'supertest';
import app from './app';

describe('Express App', () => {
  describe('GET /', () => {
    it('should return 200 OK with health check message', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });

  describe('GET /node', () => {
    it('should return 200 OK with index HTML page', async () => {
      const response = await request(app).get('/node');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('TypeScript Container');
      expect(response.text).toContain('機能一覧');
    });
  });

  describe('GET /unknown', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /node/health', () => {
    it('should return health status with configuration check', async () => {
      const response = await request(app).get('/node/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('configured');
      expect(response.body.configured).toHaveProperty('gemini', true);
      expect(response.body.configured).toHaveProperty('langchain', true);
      expect(response.body.configured).toHaveProperty('supabase', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
