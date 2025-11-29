// Set up environment variables before importing
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.LANGCHAIN_API_KEY = 'test-langchain-api-key';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.PORT = '3000';

import request from 'supertest';
import app from '../../app';

describe('Chatbot', () => {
  describe('GET /node/chat', () => {
    it('should return 200 OK with chat HTML page', async () => {
      const response = await request(app).get('/node/chat');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('Gemini AI Chatbot');
    });
  });

  describe('POST /node/chat', () => {
    it('should return 400 if message is empty', async () => {
      const response = await request(app)
        .post('/node/chat')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if message is missing', async () => {
      const response = await request(app)
        .post('/node/chat')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
