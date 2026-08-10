import { PrismaClient, UserRole, ProjectStatus, ModelFormat, ModelStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Permissions ─────────────────────────────────────────────────────────────
  const permissions = [
    // Users
    { name: 'users:read', group: 'users', description: 'Read user details' },
    { name: 'users:create', group: 'users', description: 'Create new users' },
    { name: 'users:update', group: 'users', description: 'Update user details' },
    { name: 'users:delete', group: 'users', description: 'Delete users' },
    // Clients
    { name: 'clients:read', group: 'clients', description: 'Read client details' },
    { name: 'clients:create', group: 'clients', description: 'Create clients' },
    { name: 'clients:update', group: 'clients', description: 'Update clients' },
    { name: 'clients:delete', group: 'clients', description: 'Delete clients' },
    // Projects
    { name: 'projects:read', group: 'projects', description: 'Read projects' },
    { name: 'projects:create', group: 'projects', description: 'Create projects' },
    { name: 'projects:update', group: 'projects', description: 'Update projects' },
    { name: 'projects:delete', group: 'projects', description: 'Delete projects' },
    { name: 'projects:publish', group: 'projects', description: 'Publish projects' },
    // Models
    { name: 'models:read', group: 'models', description: 'Read 3D models' },
    { name: 'models:upload', group: 'models', description: 'Upload 3D models' },
    { name: 'models:delete', group: 'models', description: 'Delete 3D models' },
    // Share Links
    { name: 'share:create', group: 'share', description: 'Create share links' },
    { name: 'share:revoke', group: 'share', description: 'Revoke share links' },
    // Analytics
    { name: 'analytics:read', group: 'analytics', description: 'View analytics' },
    { name: 'analytics:export', group: 'analytics', description: 'Export analytics' },
    // Admin
    { name: 'admin:access', group: 'admin', description: 'Access admin panel' },
    { name: 'admin:settings', group: 'admin', description: 'Manage system settings' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // ── Super Admin ─────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@NavishArc2024!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@navish.com' },
    update: {},
    create: {
      email: 'admin@navish.com',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      displayName: 'Super Admin',
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ── Seed Architect ──────────────────────────────────────────────────────────
  const architectPassword = await bcrypt.hash('Architect@NavishArc2024!', 12);

  const architect = await prisma.user.upsert({
    where: { email: 'architect@navish.com' },
    update: {},
    create: {
      email: 'architect@navish.com',
      password: architectPassword,
      firstName: 'John',
      lastName: 'Architect',
      displayName: 'John Architect',
      role: UserRole.ARCHITECT,
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Architect user: ${architect.email}`);

  // ── Seed Client ─────────────────────────────────────────────────────────────
  const clientPassword = await bcrypt.hash('Client@NavishArc2024!', 12);

  const clientUser = await prisma.user.upsert({
    where: { email: 'client@demo.com' },
    update: {},
    create: {
      email: 'client@demo.com',
      password: clientPassword,
      firstName: 'Demo',
      lastName: 'Client',
      displayName: 'Demo Client',
      role: UserRole.CLIENT,
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.client.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      companyName: 'Demo Corporation',
      industry: 'Real Estate',
      website: 'https://demo.com',
      country: 'US',
    },
  });
  console.log(`✅ Client user: ${clientUser.email}`);

  // ── System Settings ─────────────────────────────────────────────────────────
  const systemSettings = [
    { key: 'maintenance_mode', value: false, description: 'Enable maintenance mode' },
    { key: 'max_projects_per_client', value: 50, description: 'Max projects allowed per client' },
    { key: 'max_models_per_project', value: 100, description: 'Max models per project' },
    { key: 'upload_quota_gb', value: 100, description: 'Upload quota in GB per user' },
    { key: 'share_link_default_expiry_days', value: 30, description: 'Default share link expiry' },
    { key: 'analytics_retention_days', value: 365, description: 'Analytics data retention period' },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value, description: setting.description },
    });
  }
  console.log(`✅ System settings seeded`);

  // ── Demo Project ─────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: '84cd37f2-f930-48a9-b940-46e21964f1b1' },
    update: {
      isPublic: true,
      status: ProjectStatus.PUBLISHED,
    },
    create: {
      id: '84cd37f2-f930-48a9-b940-46e21964f1b1',
      name: 'Demo Luxury Apartment',
      description: 'A demonstration project showcasing NAVISH ARC capabilities.',
      slug: 'demo-luxury-apartment',
      status: ProjectStatus.PUBLISHED,
      ownerId: architect.id,
      clientId: (await prisma.client.findUnique({ where: { userId: clientUser.id } }))!.id,
      tags: ['luxury', 'apartment', 'demo'],
      isPublic: true,
      publishedAt: new Date(),
    },
  });

  // ── Demo Room ────────────────────────────────────────────────────────────────
  await prisma.room.upsert({
    where: { id: 'seed-living-room-id' },
    update: {},
    create: {
      id: 'seed-living-room-id',
      projectId: project.id,
      name: 'Living Room',
      description: 'Main living area with panoramic views',
      sortOrder: 1,
      dimensions: { width: 6, height: 3, depth: 8 },
    },
  });

  console.log(`✅ Demo project: ${project.name} (${project.id})`);
  console.log('\n🎉 Database seeding complete!\n');
  console.log('Credentials:');
  console.log('  Admin:     admin@navish.com      / Admin@NavishArc2024!');
  console.log('  Architect: architect@navish.com  / Architect@NavishArc2024!');
  console.log('  Client:    client@demo.com       / Client@NavishArc2024!\n');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
