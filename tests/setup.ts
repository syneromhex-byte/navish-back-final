import { redis } from '../src/config/redis';
import { prisma } from '../src/config/database';

afterAll(async () => {
  try {
    await redis.quit();
  } catch {}
  try {
    await prisma.$disconnect();
  } catch {}
});
