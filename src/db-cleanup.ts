import { prisma } from '../src/config/database';

async function run() {
  try {
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { startsWith: 'architect-integration-' } },
          { email: { startsWith: 'test-otp-flow-' } },
          { email: { startsWith: 'client-integration-' } },
        ],
      },
      select: { id: true },
    });

    const userIds = testUsers.map((u) => u.id);
    console.log(`Found ${userIds.length} test users to delete.`);

    if (userIds.length > 0) {
      // 1. Delete upload sessions
      await prisma.uploadSession.deleteMany({ where: { userId: { in: userIds } } });
      
      // 2. Delete project versions & members & rooms & projects
      const projects = await prisma.project.findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);
      
      if (projectIds.length > 0) {
        await prisma.projectVersion.deleteMany({ where: { projectId: { in: projectIds } } });
        await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });
        await prisma.room.deleteMany({ where: { projectId: { in: projectIds } } });
        await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
      }

      // 3. Delete models uploaded by the users
      await prisma.model.deleteMany({ where: { uploadedById: { in: userIds } } });

      // 4. Delete client profiles
      await prisma.client.deleteMany({ where: { userId: { in: userIds } } });

      // 5. Delete permissions
      await prisma.userPermission.deleteMany({ where: { userId: { in: userIds } } });

      // 6. Delete users
      const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      console.log(`CLEANED UP ${deletedUsers.count} test users.`);
    }
  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
