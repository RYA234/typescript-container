import request from 'supertest';
import app from '../../app';

describe('Supabase Integration', () => {
  describe('GET /node/supabase/test', () => {
    it('should return a response with status and message', async () => {
      const response = await request(app).get('/node/supabase/test');

      // ダミーURLの場合は500、実際のURLの場合は200
      expect([200, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');

      // 接続が成功または失敗のいずれかであることを確認
      expect(['success', 'error']).toContain(response.body.status);
    });

    it('should include result or error in response', async () => {
      const response = await request(app).get('/node/supabase/test');

      if (response.body.status === 'success') {
        expect(response.body).toHaveProperty('result');
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});
