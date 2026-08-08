import { prisma } from '../src/config/database';

async function run() {
  try {
    const indexes = await prisma.$queryRaw`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        schemaname = 'public'
        AND tablename = 'users';
    `;
    console.log('INDEXES:', JSON.stringify(indexes, null, 2));

    const constraints = await prisma.$queryRaw`
      SELECT
        conname,
        pg_get_constraintdef(oid)
      from
        pg_constraint
      where
        conrelid = 'users'::regclass;
    `;
    console.log('CONSTRAINTS:', JSON.stringify(constraints, null, 2));
  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
