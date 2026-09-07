const request = require('supertest');
const app = require('../../server');

describe('API Route Integration Tests', () => {
  describe('System & Middleware Endpoints', () => {
    it('GET / should return 200 with server status', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Filmism server is running');
    });

    it('GET /api/undefined-endpoint should return 404 with normalized JSON error', async () => {
      const res = await request(app).get('/api/undefined-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message.toLowerCase()).toContain('not found');
    });
  });

  describe('Auth Routes (Input Validation)', () => {
    it('POST /api/auth/register should return 400 on invalid email or short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ firstName: 'Test', lastName: 'User', email: 'not-an-email', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.details).toBeDefined();
    });

    it('POST /api/auth/login should return 400 on missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@filmism.app' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.details).toBeDefined();
    });
  });

  describe('Taste Profile Routes', () => {
    it('POST /api/taste-profile/initialize should return 400 if favorites are empty', async () => {
      const res = await request(app)
        .post('/api/taste-profile/initialize')
        .send({
          genres: ['Drama'],
          origins: [1],
          favorites: [],
          sessionId: 'test_session',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.details).toBeDefined();
    });

    it('GET /api/taste-profile/me should return 400 when neither auth token nor sessionId is passed', async () => {
      const res = await request(app).get('/api/taste-profile/me');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Movie Routes', () => {
    it('GET /api/movies/genres should return cached/live genre array', async () => {
      const res = await request(app).get('/api/movies/genres');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/movies/origins should return cinema origins map', async () => {
      const res = await request(app).get('/api/movies/origins');
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
      expect(res.body.Hollywood).toBe('US');
    });

    it('POST /api/movies/batch-details should return 400 for empty IDs list', async () => {
      const res = await request(app)
        .post('/api/movies/batch-details')
        .send({ ids: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
