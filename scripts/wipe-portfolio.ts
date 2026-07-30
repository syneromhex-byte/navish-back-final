import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeData() {
  console.log('🧹 Purging all portfolio and model records for a clean slate...');

  const deletedPortfolioItems = await prisma.portfolioItem.deleteMany({});
  const deletedPortfolioModels = await prisma.model.deleteMany({
    where: { isPortfolio: true },
  });

  console.log(`✅ Deleted ${deletedPortfolioItems.count} record(s) from portfolio_items table.`);
  console.log(`✅ Deleted ${deletedPortfolioModels.count} portfolio model(s) from models table.`);
  console.log('✨ Database clean slate complete! All future uploads will sync atomically.');
}

wipeData()
  .catch((err) => {
    console.error('❌ Error wiping portfolio data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
