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
});
