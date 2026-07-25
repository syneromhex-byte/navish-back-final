import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { otpService } from '../src/auth/otp/otp.service';
import { emailService } from '../src/auth/email/email.service';

jest.setTimeout(30000);

describe('NAVISH ARC Backend Direct Integration Tests', () => {
  const timestamp = Date.now();
  const testUserEmail = `architect-integration-${timestamp}@navish.com`;
  const testUserPassword = 'IntegrationTestPassword123!';
  const testClientEmail = `client-integration-${timestamp}@example.com`;

  let userToken: string;
  let userId: string;
  let clientId: string;
  let clientUserId: string;
  let projectId: string;
  let uploadSessionId: string;

  // Mock OTP generator to return a predictable code for testing
  beforeAll(() => {
    jest.spyOn(otpService, 'generateCode').mockReturnValue('123456');
    jest.spyOn(emailService as any, 'sendMail').mockResolvedValue(true as any);
  });

  // Clean up any generated test records in reverse order
  afterAll(async () => {
    try {
      if (uploadSessionId) {
        await prisma.uploadSession.deleteMany({
          where: { id: uploadSessionId },
        });
      }
      if (projectId) {
        // Delete related project versions and members
        await prisma.projectVersion.deleteMany({ where: { projectId } });
        await prisma.projectMember.deleteMany({ where: { projectId } });
        await prisma.project.delete({ where: { id: projectId } });
      }
      if (clientId) {
        await prisma.client.delete({ where: { id: clientId } });
      }
      if (clientUserId) {
        await prisma.userPermission.deleteMany({ where: { userId: clientUserId } });
        await prisma.user.delete({ where: { id: clientUserId } });
      }
      if (userId) {
        await prisma.model.deleteMany({ where: { uploadedById: userId } });
        await prisma.userPermission.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
    } catch (err: any) {
      console.warn('Cleanup error:', err.message);
    }
  });

  describe('1. Authentication Module', () => {
    it('should successfully register a new ARCHITECT user after OTP verification', async () => {
      // 1. Send OTP
      const sendRes = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          email: testUserEmail,
          name: 'Integration Architect',
        });
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.success).toBe(true);

      // 2. Verify OTP code (mocked to '123456')
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testUserEmail,
          code: '123456',
        });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // 3. Register user
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          firstName: 'Integration',
          lastName: 'Architect',
          role: 'ARCHITECT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(testUserEmail);
      userId = res.body.data.id;
    });

    it('should successfully login and return an access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(testUserEmail);
      userToken = res.body.data.accessToken;

      // Verify HTTP-Only refresh token cookie is set
      const rawCookies = res.headers['set-cookie'];
      const cookies = rawCookies ? (Array.isArray(rawCookies) ? rawCookies : [rawCookies]) : [];
      const hasRefreshToken = cookies.some((c: string) => c.startsWith('refreshToken='));
      expect(hasRefreshToken).toBe(true);
    });

    it('should resend OTP verification code successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/resend-otp')
        .send({
          email: testUserEmail,
          purpose: 'EMAIL_VERIFICATION',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should verify user email via OTP successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email-otp')
        .send({
          email: testUserEmail,
          code: '123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should trigger password reset OTP request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: testUserEmail,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reset password via OTP successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password-otp')
        .send({
          email: testUserEmail,
          code: '123456',
          password: 'NewChangedPassword123!',
          confirmPassword: 'NewChangedPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Re-login to update userToken with the new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: 'NewChangedPassword123!',
        });
      
      expect(loginRes.status).toBe(200);
      userToken = loginRes.body.data.accessToken;
    });

    it('should get current user profile using JWT token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUserEmail);
      expect(res.body.data.role).toBe('ARCHITECT');
    });

    it('should block profile actions when access token is missing or invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer invalid-token`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Client Management Module', () => {
    it('should create a new client account profile', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: testClientEmail,
          password: 'ClientPassword123!',
          firstName: 'Integration',
          lastName: 'Client',
          companyName: 'Test Integration Corp',
          industry: 'Architecture & Real Estate',
          website: 'https://test-integration-client.com',
          address: '789 Architectural Way',
          city: 'Paris',
          country: 'France',
          contactPhone: '+33123456789',
          notes: 'Integration verification client',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.companyName).toBe('Test Integration Corp');
      clientId = res.body.data.id;
      clientUserId = res.body.data.userId;
    });

    it('should list client profiles in paginated format', async () => {
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const retrieved = res.body.data.find((c: any) => c.id === clientId);
      expect(retrieved).toBeDefined();
      expect(retrieved.companyName).toBe('Test Integration Corp');
    });
  });

  describe('3. Project Management Module', () => {
    it('should successfully create a new architectural project linked to client', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Modern Penthouse Integration Test',
          description: 'A contemporary luxury penthouse concept',
          clientId: clientId,
          tags: ['Contemporary', 'Penthouse', 'Integration'],
          isPublic: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Modern Penthouse Integration Test');
      expect(res.body.data.clientId).toBe(clientId);
      projectId = res.body.data.id;
    });

    it('should edit the architectural project details', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Modified Penthouse Integration Test',
          description: 'An updated contemporary luxury penthouse concept description',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Modified Penthouse Integration Test');
    });

    it('should create version snapshot snapshots of the project', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/versions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          version: '1.0.0',
          description: 'Verification stable blueprint snapshot',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe('1.0.0');
    });

    it('should retrieve versions of the project', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/versions`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].version).toBe('1.0.0');
    });
  });

  describe('4. File Upload Module', () => {
    it('should initiate a single-put presigned URL upload session for models', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fileName: 'luxury_dining_table.glb',
          fileSize: 4500000, // 4.5MB (Fits under single-part client threshold)
          mimeType: 'model/gltf-binary',
          projectId: projectId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('uploadSessionId');
      expect(res.body.data).toHaveProperty('presignedUrl');
      expect(res.body.data.isMultipart).toBe(false);
      uploadSessionId = res.body.data.uploadSessionId;
    });

    it('should fetch the initialized upload session parameters', async () => {
      const res = await request(app)
        .get(`/api/v1/uploads/session/${uploadSessionId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileName).toBe('luxury_dining_table.glb');
      expect(res.body.data.status).toBe('UPLOADING');
    });

    it('should successfully stream model upload data and complete session', async () => {
      const testContent = Buffer.from('gltf-binary-simulated-content-chunk-stream');
      const res = await request(app)
        .post(`/api/v1/uploads/stream/${uploadSessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Length', testContent.length.toString())
        .send(testContent);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('PROCESSING');
    });
  });

  describe('5. Admin Features Module', () => {
    let originalAdmins: Array<{ id: string }> = [];

    beforeAll(async () => {
      // Find all existing admin users so we can restore them later
      originalAdmins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      // Temporarily change all other admin roles to CLIENT to avoid violating unique constraint unique_admin_role
      if (originalAdmins.length > 0) {
        for (const admin of originalAdmins) {
          await prisma.user.update({
            where: { id: admin.id },
            data: { role: 'CLIENT' },
          });
        }
      }

      // Elevate test user role to ADMIN in the DB to query stats
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' },
      });
    });

    afterAll(async () => {
      // De-elevate test user first so we can restore others
      try {
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { role: 'ARCHITECT' },
          });
        }
      } catch (err) {}

      // Restore original admins
      if (originalAdmins.length > 0) {
        for (const admin of originalAdmins) {
          try {
            await prisma.user.update({
              where: { id: admin.id },
              data: { role: 'ADMIN' },
            });
          } catch (err) {}
        }
      }
    });

    it('should retrieve admin dashboard stats with extended metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('users');
      expect(res.body.data).toHaveProperty('projects');
      expect(res.body.data).toHaveProperty('clients');
      expect(res.body.data).toHaveProperty('models');
      expect(res.body.data).toHaveProperty('storage');
      expect(res.body.data).toHaveProperty('recentUploads');
      expect(res.body.data).toHaveProperty('recentActivity');
    });

    it('should retrieve admin audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/logs')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
