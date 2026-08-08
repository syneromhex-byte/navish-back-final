import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { otpService } from '../src/auth/otp/otp.service';
import { verifiedEmailStore } from '../src/auth/services/verified-email.store';
import { emailService } from '../src/auth/email/email.service';

jest.setTimeout(30000);

describe('Auth Registration & OTP Decoupled Flow Unit Tests', () => {
  const timestamp = Date.now();
  const testEmail = `test-otp-flow-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(() => {
    // Mock the OTP generator so we have a reliable OTP code
    jest.spyOn(otpService, 'generateCode').mockReturnValue('999999');
    // Mock SMTP sendMail to avoid real email delivery network latency
    jest.spyOn(emailService as any, 'sendMail').mockResolvedValue(true as any);
  });

  afterAll(async () => {
    // Clean up test user and OTPs if any exist
    try {
      await prisma.otp.deleteMany({ where: { email: testEmail } });
      await prisma.user.deleteMany({ where: { email: testEmail } });
      await verifiedEmailStore.consume(testEmail);
    } catch (err) {
      // Ignored
    }
  });

  it('1. POST /auth/register should fail as email is not yet verified', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Email verification required');
  });

  it('2. POST /auth/send-otp should succeed and generate OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({
        email: testEmail,
        name: 'Test User',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('3. POST /auth/verify-otp should succeed with correct mock code and save state', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        email: testEmail,
        code: '999999',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Redis verified state should be active now
    const hasVerified = await verifiedEmailStore.has(testEmail);
    expect(hasVerified).toBe(true);
  });

  it('4. POST /auth/register should now succeed and mark user verified and active', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.emailVerified).toBe(true);

    // Verified state should be consumed and deleted from store
    const hasVerified = await verifiedEmailStore.has(testEmail);
    expect(hasVerified).toBe(false);
  });

  it('5. POST /auth/login should now succeed with newly registered user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });
});
