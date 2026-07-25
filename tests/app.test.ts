import request from 'supertest';
import app from '../src/app';

describe('Sanity & Application Integration Tests', () => {
  it('GET /api/v1/health should return a healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /invalid-route should return 404 error response', async () => {
    const res = await request(app).get('/invalid-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('message');
  });
});
