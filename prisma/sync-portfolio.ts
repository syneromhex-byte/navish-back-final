import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncProjectsToPortfolio() {
  console.log('🔄 Syncing public projects to portfolio_items table...');

  const publicProjects = await prisma.project.findMany({
    where: {
      isPublic: true,
      deletedAt: null,
    },
  });

  console.log(`Found ${publicProjects.length} public project(s).`);

  let insertedCount = 0;
  for (const proj of publicProjects) {
    const existing = await prisma.portfolioItem.findUnique({
      where: { id: proj.id },
    });

    if (!existing) {
      await prisma.portfolioItem.create({
        data: {
          id: proj.id,
          title: proj.name,
          description: proj.description || null,
          category: 'Residential',
          modelUrl: proj.coverImageUrl || '',
          thumbnailUrl: proj.thumbnailUrl || null,
          isPublic: true,
          createdById: proj.ownerId,
          createdAt: proj.createdAt,
          updatedAt: proj.updatedAt,
        },
      });
      insertedCount++;
    }
  }

  console.log(`✅ Successfully synced ${insertedCount} project(s) to portfolio_items table.`);
}

syncProjectsToPortfolio()
  .catch((err) => {
    console.error('Error syncing portfolio:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
