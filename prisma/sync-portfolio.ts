import { PrismaClient, ModelFormat, ModelStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function syncProjectsToPortfolio() {
  console.log('🔄 Syncing public projects and models to portfolio_items table...');

  // 1. Update all existing portfolio_items to be public
  const updatedPortfolio = await prisma.portfolioItem.updateMany({
    where: { isPublic: false },
    data: { isPublic: true },
  });
  console.log(`✅ Set isPublic: true on ${updatedPortfolio.count} portfolio item(s).`);

  // 2. Update all existing portfolio models in Model table to be public
  const updatedModels = await prisma.model.updateMany({
    where: { isPortfolio: true, isPublic: false },
    data: { isPublic: true },
  });
  console.log(`✅ Set isPublic: true on ${updatedModels.count} portfolio model(s).`);

  // 3. Sync public projects to portfolio_items
  const publicProjects = await prisma.project.findMany({
    where: {
      isPublic: true,
      deletedAt: null,
    },
  });

  let insertedProjects = 0;
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
      insertedProjects++;
    }
  }
  console.log(`✅ Synced ${insertedProjects} public project(s) to portfolio_items table.`);

  // 4. Sync PortfolioItem records to Model table
  const allPortfolioItems = await prisma.portfolioItem.findMany();
  let insertedModels = 0;
  for (const item of allPortfolioItems) {
    const existingModel = await prisma.model.findUnique({
      where: { id: item.id },
    });

    if (!existingModel && item.modelUrl) {
      const ext = item.format ? item.format.toUpperCase() : 'GLB';
      const formatEnum = ext === '3DS' ? ModelFormat.THREE_DS : (ModelFormat[ext as keyof typeof ModelFormat] ?? ModelFormat.GLB);
      await prisma.model.create({
        data: {
          id: item.id,
          name: item.title,
          description: item.description || null,
          format: formatEnum,
          status: ModelStatus.READY,
          fileSize: item.sizeBytes || BigInt(0),
          originalName: `${item.title}.${ext.toLowerCase()}`,
          storagePath: item.modelUrl,
          publicUrl: item.modelUrl,
          thumbnailUrl: item.thumbnailUrl || null,
          isPortfolio: true,
          isPublic: true,
          uploadedById: item.createdById,
        },
      }).catch(() => {});
      insertedModels++;
    }
  }
  console.log(`✅ Synced ${insertedModels} portfolio item(s) to models table.`);
}

syncProjectsToPortfolio()
  .catch((err) => {
    console.error('Error syncing portfolio:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
