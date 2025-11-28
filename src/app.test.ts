// Set up environment variables before importing app
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
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
    it('should return 200 OK with welcome message', async () => {
      const response = await request(app).get('/node');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello from Node.js on ECS!');
    });
  });

  describe('GET /unknown', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /config-status', () => {
    it('should return configuration status', async () => {
      const response = await request(app).get('/config-status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'configured');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('gemini');
      expect(response.body.services).toHaveProperty('supabase');
      expect(response.body.services.supabase).toHaveProperty('url', 'https://test-project.supabase.co');
      expect(response.body).toHaveProperty('port', 3000);
    });
  });
});
